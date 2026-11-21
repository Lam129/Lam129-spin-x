"""Procedural Blender modelling for every bey part (original designs).
Run:  python build_parts.py   (with the bpy module installed)
Writes one GLB per part into ../assets/. Each GLB holds named meshes that the game re-materials:
  blade:   sub, metal, frame, clear, chip
  ratchet: body, teeth
  bit:     body, gear | guard, tip
Coordinates: built Z-up in Blender; the glTF exporter converts to the game's Y-up.
"""
import bpy, bmesh, json, math, os
from mathutils import Vector

TAU = math.tau
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets')
os.makedirs(OUT, exist_ok=True)
P = json.load(open(os.path.join(HERE, 'parts.json')))

def clamp(v, a, b): return max(a, min(b, v))
def smoothstep(a, b, x):
    t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def lerp(a, b, t): return a + (b - a) * t
def frac(x): return x - math.floor(x)

def outline_r(s, th):
    kind, n, base, amp = s['kind'], s['n'], s['base'], s['amp']
    u = frac(th * n / TAU)
    if kind == 'fang': return base + amp * ((u / 0.14) ** 0.5 if u < 0.14 else (1 - (u - 0.14) / 0.86) ** 2.4) + 0.012 * math.sin(u * TAU * 3)
    if kind == 'saw': return base + amp * ((u / 0.72) ** 1.3 if u < 0.72 else 1 - (u - 0.72) / 0.28)
    if kind == 'round': return base + amp * (0.5 + 0.5 * math.cos(u * TAU)) - 0.012 * smoothstep(0.42, 0.5, u) * (1 - smoothstep(0.5, 0.58, u))
    if kind == 'hex':
        a = (u - 0.5) * TAU / n
        return base * math.cos(math.pi / n) / math.cos(a) - 0.015 * abs(math.cos(u * math.pi)) ** 40
    if kind == 'gear': return base + amp * (smoothstep(0.04, 0.12, u) - smoothstep(0.5, 0.58, u)) + 0.01 * math.sin(u * TAU * 2)
    if kind == 'wing': return base + amp * math.sin(u * math.pi) ** 1.4 * (1 - 0.4 * u)
    if kind == 'star': return base + amp * abs(math.cos(u * math.pi)) ** 2.6
    if kind == 'hybrid':
        half = frac(th * n / 2 / TAU) < 0.5
        if half: return base + amp * ((u / 0.16) ** 0.55 if u < 0.16 else (1 - (u - 0.16) / 0.84) ** 2.2)
        return base + amp * 0.42 * (0.5 + 0.5 * math.cos(u * TAU))
    return base

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    return ob

def solid_ring(name, fn_outer, r_inner, height_fn, z0=0.0, N=256, K=10, inner_fn=None):
    """Closed solid between an inner radius and an outer outline; top surface height_fn(t, th)."""
    bm = bmesh.new()
    top, bot = [], []
    for k in range(K + 1):
        t = k / K
        rt, rb = [], []
        for i in range(N):
            th = i / N * TAU
            ri = inner_fn(th) if inner_fn else r_inner
            r = lerp(ri, fn_outer(th), t)
            x, y = math.cos(th) * r, math.sin(th) * r
            rt.append(bm.verts.new((x, y, z0 + height_fn(t, th))))
            rb.append(bm.verts.new((x, y, z0)))
        top.append(rt); bot.append(rb)
    for k in range(K):
        for i in range(N):
            j = (i + 1) % N
            bm.faces.new((top[k][i], top[k + 1][i], top[k + 1][j], top[k][j]))
            bm.faces.new((bot[k][j], bot[k + 1][j], bot[k + 1][i], bot[k][i]))
    for i in range(N):
        j = (i + 1) % N
        bm.faces.new((bot[K][i], bot[K][j], top[K][j], top[K][i]))   # outer wall
        bm.faces.new((top[0][i], top[0][j], bot[0][j], bot[0][i]))   # inner wall
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm)

def prism(name, pts2d, z0, z1):
    bm = bmesh.new()
    b = [bm.verts.new((x, y, z0)) for x, y in pts2d]
    t = [bm.verts.new((x, y, z1)) for x, y in pts2d]
    bm.faces.new(b[::-1]); bm.faces.new(t)
    n = len(pts2d)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((b[i], b[j], t[j], t[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm)

def slot_pts(r0, r1, th, hw, n=12):
    pts = []
    for i in range(n + 1):
        a = th - hw + 2 * hw * i / n; pts.append((math.cos(a) * r1, math.sin(a) * r1))
    for i in range(n, -1, -1):
        a = th - hw * 0.7 + 1.4 * hw * i / n; pts.append((math.cos(a) * r0, math.sin(a) * r0))
    return pts

def boolean_diff(ob, cutters):
    for c in cutters:
        m = ob.modifiers.new('bool', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.solver = 'EXACT'; m.object = c
        apply_mods(ob)
        bpy.data.objects.remove(c, do_unlink=True)

def apply_mods(ob):
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects: o.select_set(False)
    ob.select_set(True)
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)

def finish(ob, bevel=0.004, segs=2, angle=35, weighted=True):
    if bevel > 0:
        m = ob.modifiers.new('bevel', 'BEVEL'); m.width = bevel; m.segments = segs
        m.limit_method = 'ANGLE'; m.angle_limit = math.radians(angle); m.harden_normals = False
        m.miter_outer = 'MITER_ARC'
    apply_mods(ob)
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects: o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(28), keep_sharp_edges=True)
    return ob

def rotate_z(ob, a):
    ob.rotation_euler[2] = a
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects: o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def export(path):
    for o in bpy.context.scene.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_normals=True, export_texcoords=False, export_materials='NONE',
                              export_yup=True, export_extras=False)

def wedge(depth, thin, rim=0.25):
    def h(t, th):
        return depth - depth * thin * smoothstep(0.15, 1, t) - depth * rim * smoothstep(0.88, 1, t)
    return h

# ------------------------------------------------------------------ blades
def build_blade(b):
    reset()
    s = b['shape']; n = 6 if s['kind'] == 'hex' else s['n']
    main_fn = lambda th: outline_r(s, th)
    def sub_fn(th):
        u = frac(th * n * 2 / TAU)
        return (s['base'] - 0.02) + 0.035 * (u / 0.25 if u < 0.25 else 1 - (u - 0.25) / 0.75)
    def frame_fn(th):
        u = frac(th * n / TAU)
        wing = smoothstep(0, 0.12, u) * (1 - smoothstep(0.32, 0.5, u)) if u < 0.5 else 0
        return 0.255 + wing * (s['base'] - 0.22)
    # sub blade
    sub = solid_ring('sub', sub_fn, 0.2, wedge(0.035, 0.3), z0=0.0, K=3, N=160)
    rotate_z(sub, math.pi / n); finish(sub, 0.003)
    # main blade with windows
    main = solid_ring('metal', main_fn, 0.205, wedge(0.075, 0.62), z0=0.03, K=6, N=224)
    cutters = []
    rr = s['base'] - 0.04
    if rr > 0.27:
        for i in range(n):
            a = i / n * TAU + math.pi / n
            cutters.append(prism('cut', slot_pts(0.245, min(rr, 0.31), a, min(0.34, 1.1 / n)), -0.1, 0.3))
    # shallow chevron notches on the rim top (engraved detail)
    for i in range(n):
        a = i / n * TAU + 0.35
        r0 = main_fn(a) - 0.06
        pts = [(math.cos(a - 0.05) * r0, math.sin(a - 0.05) * r0), (math.cos(a) * (r0 + 0.025), math.sin(a) * (r0 + 0.025)),
               (math.cos(a + 0.05) * r0, math.sin(a + 0.05) * r0), (math.cos(a) * (r0 + 0.012), math.sin(a) * (r0 + 0.012))]
        cutters.append(prism('cut', pts, 0.03 + 0.05, 0.3))
    boolean_diff(main, cutters)
    finish(main, 0.005, 3)
    # polymer frame
    frame = solid_ring('frame', frame_fn, 0.19, wedge(0.05, 0.5), z0=0.1, K=4, N=180)
    rotate_z(frame, -0.22); finish(frame, 0.006, 3)
    clear = solid_ring('clear', lambda th: frame_fn(th + 0.35) * 0.96, 0.19, wedge(0.02, 0.2), z0=0.155, K=2, N=160)
    finish(clear, 0.003)
    # centre chip ring (12-point faceted)
    def chip_fn(th):
        u = frac(th * 12 / TAU)
        return 0.228 - 0.013 * smoothstep(0.35, 0.5, u) * (1 - smoothstep(0.5, 0.65, u))
    chip = solid_ring('chip', chip_fn, 0.17, lambda t, th: 0.07 - 0.012 * smoothstep(0.6, 1, t), z0=0.11, K=2, N=96)
    finish(chip, 0.004, 2)
    export(os.path.join(OUT, f"blade_{b['id']}.glb"))

# ------------------------------------------------------------------ ratchets
def build_ratchet(r):
    reset()
    h = r['h'] / 500; pr = r['prongs']
    def body_fn(th):
        u = frac(th * pr / TAU)
        return 0.235 - 0.012 * smoothstep(0.42, 0.48, u) * (1 - smoothstep(0.52, 0.58, u))
    body = solid_ring('body', body_fn, 0.12, lambda t, th: h * 0.7, z0=0.006, K=1, N=150)
    finish(body, 0.005, 2)
    tw = clamp(TAU / pr * 0.42, 0.18, 0.9)
    teeth = []
    for i in range(pr):
        a0 = i / pr * TAU
        bm = bmesh.new(); M = 14
        rows = []
        for k, rad in enumerate((0.165, 0.255)):
            top, bot = [], []
            for j in range(M + 1):
                a = a0 + tw * j / M; t = j / M
                x, y = math.cos(a) * rad, math.sin(a) * rad
                z1 = h * 0.62 + h * 0.12 + h * 0.33 * (0.35 + 0.65 * t)
                top.append(bm.verts.new((x, y, z1))); bot.append(bm.verts.new((x, y, h * 0.62)))
            rows.append((top, bot))
        (ti, bi), (to, bo) = rows
        for j in range(M):
            bm.faces.new((ti[j], to[j], to[j + 1], ti[j + 1]))
            bm.faces.new((bi[j + 1], bo[j + 1], bo[j], bi[j]))
            bm.faces.new((bo[j], bo[j + 1], to[j + 1], to[j]))
            bm.faces.new((ti[j], ti[j + 1], bi[j + 1], bi[j]))
        bm.faces.new((bi[0], bo[0], to[0], ti[0])); bm.faces.new((ti[M], to[M], bo[M], bi[M]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        ob = new_obj('tooth', bm); finish(ob, 0.004, 2); teeth.append(ob)
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in teeth: o.select_set(True)
    bpy.context.view_layer.objects.active = teeth[0]
    bpy.ops.object.join(); teeth[0].name = 'teeth'; teeth[0].data.name = 'teeth'
    export(os.path.join(OUT, f"ratchet_{r['id']}.glb"))

# ------------------------------------------------------------------ bits
BIT_LEN = {'flat': 0.25, 'rush': 0.25, 'rubber': 0.25, 'taper': 0.26, 'point': 0.26, 'ball': 0.26, 'needle': 0.28, 'hneedle': 0.34}
def bit_profile(tip, L):
    p = [(0.001, 0), (0.19, 0), (0.2, -0.01), (0.2, -0.045), (0.16, -0.06), (0.145, -0.075), (0.145, -0.13), (0.135, -0.14)]
    if tip == 'flat': p += [(0.12, -0.16), (0.115, -L + 0.012), (0.105, -L), (0.001, -L)]
    elif tip == 'rush': p += [(0.12, -0.16), (0.108, -L + 0.03), (0.09, -L + 0.004), (0.07, -L), (0.001, -L)]
    elif tip == 'rubber': p += [(0.125, -0.16), (0.125, -L + 0.06), (0.001, -L + 0.06)]
    elif tip == 'taper': p += [(0.11, -0.16), (0.05, -L + 0.012), (0.04, -L), (0.001, -L)]
    elif tip == 'point': p += [(0.1, -0.16), (0.035, -L + 0.016), (0.016, -L + 0.002), (0.001, -L)]
    elif tip == 'ball':
        p += [(0.1, -0.16)] + [(math.cos(i / 10 * math.pi / 2) * 0.075 + 0.001, -L + 0.075 - math.sin(i / 10 * math.pi / 2) * 0.075) for i in range(11)]
    elif tip == 'needle': p += [(0.095, -0.15), (0.03, -L + 0.03), (0.004, -L)]
    elif tip == 'hneedle': p += [(0.11, -0.16), (0.085, -0.25), (0.03, -L + 0.03), (0.004, -L)]
    return p

def lathe(name, prof, segs=96, z_off=0.0):
    bm = bmesh.new()
    rings = []
    for (r, z) in prof:
        rings.append([bm.verts.new((math.cos(i / segs * TAU) * r, math.sin(i / segs * TAU) * r, z + z_off)) for i in range(segs)])
    for k in range(len(rings) - 1):
        for i in range(segs):
            j = (i + 1) % segs
            bm.faces.new((rings[k][i], rings[k + 1][i], rings[k + 1][j], rings[k][j]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm)

def build_bit(b):
    reset()
    L = BIT_LEN[b['tip']]
    prof = bit_profile(b['tip'], L)
    body = lathe('body', prof, 72, z_off=L)
    # vertical grip flutes on the body (boolean), lock tabs
    cut = []
    for i in range(10):
        a = i / 10 * TAU
        pts = [(math.cos(a - 0.05) * 0.16, math.sin(a - 0.05) * 0.16), (math.cos(a) * 0.135, math.sin(a) * 0.135), (math.cos(a + 0.05) * 0.16, math.sin(a + 0.05) * 0.16)]
        cut.append(prism('cut', pts, L - 0.135, L - 0.08))
    boolean_diff(body, cut)
    finish(body, 0.003, 2, 30)
    tabs = []
    for k in range(2):
        a = k * math.pi
        cx, cy = math.cos(a) * 0.205, math.sin(a) * 0.205
        pts = [(cx + math.cos(a + d) * 0.03 - math.sin(a) * w, cy + math.sin(a + d) * 0.03 + math.cos(a) * w) for d, w in ((0, -0.03), (0, 0.03))]
        pts = [(math.cos(a) * 0.185 - math.sin(a) * -0.03, math.sin(a) * 0.185 + math.cos(a) * -0.03),
               (math.cos(a) * 0.225 - math.sin(a) * -0.022, math.sin(a) * 0.225 + math.cos(a) * -0.022),
               (math.cos(a) * 0.225 - math.sin(a) * 0.022, math.sin(a) * 0.225 + math.cos(a) * 0.022),
               (math.cos(a) * 0.185 - math.sin(a) * 0.03, math.sin(a) * 0.185 + math.cos(a) * 0.03)]
        t = prism('tab', pts, L - 0.045, L - 0.008); finish(t, 0.004, 2); tabs.append(t)
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in tabs: o.select_set(True)
    bpy.context.view_layer.objects.active = tabs[0]; bpy.ops.object.join(); tabs[0].name = 'tabs'; tabs[0].data.name = 'tabs'
    if b['grip'] > 0.3:
        teeth = 20 if b['grip'] > 1 else 18 if b['grip'] > 0.8 else 14
        def gear_fn(th):
            u = frac(th * teeth / TAU)
            if u < 0.15: return lerp(0.15, 0.188, u / 0.15)
            if u < 0.5: return 0.188
            if u < 0.65: return lerp(0.188, 0.15, (u - 0.5) / 0.15)
            return 0.15
        g = solid_ring('gear', gear_fn, 0.12, lambda t, th: 0.032, z0=L - 0.14, K=1, N=teeth * 8)
        finish(g, 0.003, 2, 40)
    else:
        g = lathe('guard', [(0.12, -0.10), (0.162, -0.10), (0.166, -0.115), (0.162, -0.13), (0.12, -0.13)], 96, z_off=L)
        finish(g, 0.0, 1, weighted=False)
    if b['tip'] in ('needle', 'hneedle', 'ball', 'point'):
        tp = [(r * 1.01, z) for (r, z) in prof if z < -L + 0.05]
        if tp[0][0] > 0.002: tp = [(0.001, tp[0][1])] + tp if False else tp
        lathe('tip', [(0.001, tp[0][1])] + tp if tp[0][0] > 0.01 else tp, 64, z_off=L)
    export(os.path.join(OUT, f"bit_{b['id']}.glb"))

if __name__ == '__main__':
    import sys
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for b in P['blades']:
        if not only or only == b['id']: build_blade(b); print('blade', b['id'])
    for r in P['ratchets']:
        if not only or only == r['id']: build_ratchet(r); print('ratchet', r['id'])
    for b in P['bits']:
        if not only or only == b['id']: build_bit(b); print('bit', b['id'])
