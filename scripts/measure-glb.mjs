/**
 * Measure the GLB assets: bounding box per mesh and per file, plus the mesh, primitive and
 * material names the runtime material heuristics key on.
 *
 * The plan's Task 13 asks for the court bounding box to be re-measured after any change, and
 * `Court.tsx` / `Player.tsx` both pick materials by name, so those names are load-bearing and
 * worth being able to check rather than assume. Nothing in the repo could read a GLB outside a
 * browser, so the numbers in the audit could not be reproduced.
 *
 * Reads the glTF JSON chunk directly and uses each POSITION accessor's own `min`/`max`, which
 * the spec requires to be present for POSITION. That is exact and needs no mesh decoding, but
 * it means the numbers are in each mesh's local space: node transforms are applied here, and
 * anything animated or skinned would not be covered. Neither model has either.
 *
 * Usage: node scripts/measure-glb.mjs [--planes] [file...]
 *
 * `--planes` additionally lists the distinct x, y and z coordinates each primitive's vertices
 * sit on. A court built from axis-aligned boxes has very few, and they are the lines a player
 * sees — so this is how to tell whether a bounding-box discrepancy is one stray edge or the
 * whole mesh being the wrong size, which decides whether a scale is the right fix.
 */
import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, basename } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const MODELS_DIR = join(root, 'public', 'models')

const GLB_MAGIC = 0x46546c67
const CHUNK_JSON = 0x4e4f534a
const CHUNK_BIN = 0x004e4942

/** Pull the JSON and binary chunks out of a binary glTF container. */
function readGlb(path) {
  const buffer = readFileSync(path)
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  if (view.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error(`${basename(path)} is not a binary glTF (bad magic)`)
  }

  let json = null
  let bin = null
  let offset = 12
  while (offset < view.byteLength) {
    const chunkLength = view.getUint32(offset, true)
    const chunkType = view.getUint32(offset + 4, true)
    const start = buffer.byteOffset + offset + 8
    if (chunkType === CHUNK_JSON) {
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer.buffer, start, chunkLength)))
    } else if (chunkType === CHUNK_BIN) {
      bin = new Uint8Array(buffer.buffer, start, chunkLength)
    }
    offset += 8 + chunkLength
  }
  if (!json) throw new Error(`${basename(path)} has no JSON chunk`)
  return { json, bin }
}

/** Decode a FLOAT VEC3 accessor into an array of points. Enough for POSITION on these models. */
function readVec3Accessor(gltf, bin, accessorIndex) {
  const accessor = gltf.accessors[accessorIndex]
  if (accessor.componentType !== 5126 || accessor.type !== 'VEC3') {
    throw new Error(`accessor ${accessorIndex} is not a float VEC3`)
  }
  const bufferView = gltf.bufferViews[accessor.bufferView]
  const base = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const stride = bufferView.byteStride ?? 12
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength)

  const points = []
  for (let i = 0; i < accessor.count; i++) {
    const at = base + i * stride
    points.push([
      view.getFloat32(at, true),
      view.getFloat32(at + 4, true),
      view.getFloat32(at + 8, true),
    ])
  }
  return points
}

/** Compose a node's local TRS into a 4x4 matrix, column-major as glTF stores it. */
function nodeMatrix(node) {
  if (node.matrix) return node.matrix.slice()

  const [tx, ty, tz] = node.translation ?? [0, 0, 0]
  const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = node.scale ?? [1, 1, 1]

  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz
  const xx = qx * x2, xy = qx * y2, xz = qx * z2
  const yy = qy * y2, yz = qy * z2, zz = qz * z2
  const wx = qw * x2, wy = qw * y2, wz = qw * z2

  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ]
}

function multiply(a, b) {
  const out = new Array(16).fill(0)
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k]
      out[col * 4 + row] = sum
    }
  }
  return out
}

function transformPoint(m, [x, y, z]) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ]
}

function emptyBounds() {
  return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
}

function growByPoint(bounds, point) {
  for (let axis = 0; axis < 3; axis++) {
    bounds.min[axis] = Math.min(bounds.min[axis], point[axis])
    bounds.max[axis] = Math.max(bounds.max[axis], point[axis])
  }
}

/**
 * Grow `bounds` by an accessor's own min/max corner box, transformed into world space.
 *
 * All eight corners have to be transformed, not just min and max: a rotation would otherwise
 * report a box that does not contain the geometry.
 */
function growByAccessor(bounds, accessor, matrix) {
  const { min, max } = accessor
  for (let corner = 0; corner < 8; corner++) {
    growByPoint(bounds, transformPoint(matrix, [
      corner & 1 ? max[0] : min[0],
      corner & 2 ? max[1] : min[1],
      corner & 4 ? max[2] : min[2],
    ]))
  }
}

const f = n => (Object.is(n, -0) ? 0 : n).toFixed(3).padStart(7)
const size = b => b.min.map((lo, axis) => b.max[axis] - lo)

/** Distinct coordinates on one axis, to millimetre precision, with a count of vertices on each. */
function planes(points, axis) {
  const counts = new Map()
  for (const point of points) {
    const key = Math.round(point[axis] * 1000) / 1000
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => a[0] - b[0])
}

function measure(path, showPlanes) {
  const { json: gltf, bin } = readGlb(path)
  const scene = gltf.scenes?.[gltf.scene ?? 0]
  const total = emptyBounds()
  const rows = []

  const walk = (nodeIndex, parentMatrix) => {
    const node = gltf.nodes[nodeIndex]
    const matrix = multiply(parentMatrix, nodeMatrix(node))

    if (node.mesh !== undefined) {
      const mesh = gltf.meshes[node.mesh]
      mesh.primitives.forEach((primitive, index) => {
        const accessor = gltf.accessors[primitive.attributes.POSITION]
        if (!accessor?.min || !accessor?.max) {
          throw new Error(`${basename(path)}: POSITION accessor has no min/max`)
        }
        const bounds = emptyBounds()
        growByAccessor(bounds, accessor, matrix)
        growByAccessor(total, accessor, matrix)

        rows.push({
          name: `${mesh.name ?? `mesh${node.mesh}`}${mesh.primitives.length > 1 ? `_${index}` : ''}`,
          material: primitive.material === undefined
            ? '(none)'
            : gltf.materials[primitive.material].name ?? `material${primitive.material}`,
          bounds,
          points: showPlanes && bin
            ? readVec3Accessor(gltf, bin, primitive.attributes.POSITION)
              .map(point => transformPoint(matrix, point))
            : null,
        })
      })
    }

    for (const child of node.children ?? []) walk(child, matrix)
  }

  for (const nodeIndex of scene?.nodes ?? []) walk(nodeIndex, nodeMatrix({}))

  console.log(`\n${basename(path)}`)
  console.log(`  ${'primitive'.padEnd(16)} ${'material'.padEnd(10)} ${'size w x h x d'.padEnd(25)} min -> max (y)`)
  for (const row of rows) {
    const [w, h, d] = size(row.bounds)
    console.log(
      `  ${row.name.padEnd(16)} ${row.material.padEnd(10)}`
      + ` ${f(w)} x${f(h)} x${f(d)}   ${f(row.bounds.min[1])} ->${f(row.bounds.max[1])}`
    )
  }

  const [w, h, d] = size(total)
  console.log(`  ${'TOTAL'.padEnd(27)} ${f(w)} x${f(h)} x${f(d)}`)
  console.log(`  ${'origin'.padEnd(27)} x ${f(total.min[0])} ->${f(total.max[0])}`
    + `   y ${f(total.min[1])} ->${f(total.max[1])}`
    + `   z ${f(total.min[2])} ->${f(total.max[2])}`)

  for (const row of rows.filter(r => r.points)) {
    console.log(`\n  ${row.name} (${row.material}) — ${row.points.length} vertices`)
    for (const [axis, label] of [[0, 'x'], [1, 'y'], [2, 'z']]) {
      const found = planes(row.points, axis)
      console.log(`    ${label}: ${found.map(([at, n]) => `${at}(${n})`).join(' ')}`)
    }
  }

  return { path, total }
}

const args = process.argv.slice(2)
const showPlanes = args.includes('--planes')
const files = args.filter(arg => !arg.startsWith('--'))
const targets = files.length
  ? files
  : readdirSync(MODELS_DIR).filter(name => name.endsWith('.glb')).map(name => join(MODELS_DIR, name))

for (const target of targets) measure(target, showPlanes)
console.log()
