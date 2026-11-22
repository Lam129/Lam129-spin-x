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

def clean_outline(s, th):
    """same silhouette family as the game's outline, without the small sine ripple that made edges look soft"""
    kind, n, base, amp = s['kind'], s['n'], s['base'], s['amp']
    u = frac(th * n / TAU)
    if kind == 'fang': return base + amp * ((u / 0.14) ** 0.5 if u < 0.14 else (1 - (u - 0.14) / 0.86) ** 2.4)
    if kind == 'gear': return base + amp * (smoothstep(0.04, 0.12, u) - smoothstep(0.5, 0.58, u))
    return outline_r(s, th)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    return ob

def solid_ring(name, fn_outer, r_inner, height_fn, z0=0.0, N=256, K=10, inner_fn=None, ts=None, bot_fn=None):
    """Closed solid between an inner radius and an outer outline; top surface height_fn(t, th).
    ts: explicit radial break points (0..1) so tiers become crisp planar facets."""
    bm = bmesh.new()
    top, bot = [], []
    ts = ts or [k / K for k in range(K + 1)]
    K = len(ts) - 1
    for k in range(K + 1):
        t = ts[k]
        rt, rb = [], []
        for i in range(N):
            th = i / N * TAU
            ri = inner_fn(th) if inner_fn else r_inner
            r = lerp(ri, fn_outer(th), t)
            x, y = math.cos(th) * r, math.sin(th) * r
            rt.append(bm.verts.new((x, y, z0 + height_fn(t, th))))
            rb.append(bm.verts.new((x, y, z0 + (bot_fn(t, th) if bot_fn else 0.0))))
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

def finish(ob, bevel=0.004, segs=2, angle=35, weighted=True, smooth=30):
    """Hard-surface finish: angle-limited bevel on every crease, smooth-by-angle, then weighted normals so
    flat panels stay perfectly flat and the bevels carry the highlights (the 'machined part' look)."""
    if bevel > 0:
        m = ob.modifiers.new('bevel', 'BEVEL'); m.width = bevel; m.segments = segs
        m.limit_method = 'ANGLE'; m.angle_limit = math.radians(angle); m.harden_normals = False
        m.miter_outer = 'MITER_ARC'; m.profile = 0.6
    apply_mods(ob)
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects: o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(smooth), keep_sharp_edges=True)
    if weighted:
        w = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); w.keep_sharp = True; w.weight = 80; w.mode = 'FACE_AREA'
        apply_mods(ob)
    return ob

def join(objs, name):
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); objs[0].name = name; objs[0].data.name = name
    return objs[0]

def bake_ao(samples=48):
    """Ambient occlusion baked into a vertex colour: crevices, seams and the underside of overhangs darken
    naturally, which is most of what separates a 'real' object from a CG one."""
    obs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    for o in obs:
        if 'AO' not in o.data.color_attributes:
            o.data.color_attributes.new('AO', 'BYTE_COLOR', 'POINT')
        o.data.color_attributes.active_color_name = 'AO'
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.render.bake.target = 'VERTEX_COLORS'
    w = sc.world or bpy.data.worlds.new('w'); sc.world = w
    w.light_settings.distance = 0.12          # AO reach in metres-ish: local contact shadows only
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.bake(type='AO')

def rotate_z(ob, a):
    ob.rotation_euler[2] = a
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects: o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def export(path, ao=True):
    if ao: bake_ao()
    for o in bpy.context.scene.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_normals=True, export_texcoords=False, export_materials='NONE',
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                              export_yup=True, export_extras=False)

def wedge(depth, thin, rim=0.25):
    def h(t, th):
        return depth - depth * thin * smoothstep(0.15, 1, t) - depth * rim * smoothstep(0.88, 1, t)
    return h

# ------------------------------------------------------------------ blades
def hex_pts(cx, cy, r, rot=0.0):
    return [(cx + math.cos(rot + i * TAU / 6) * r, cy + math.sin(rot + i * TAU / 6) * r) for i in range(6)]

def strip_pts(a, r0, r1, w0, w1):
    """radial strip (quad) along angle a from r0 to r1, widths w0 -> w1"""
    c, s_ = math.cos(a), math.sin(a); px, py = -s_, c
    return [(c * r0 + px * w0, s_ * r0 + py * w0), (c * r1 + px * w1, s_ * r1 + py * w1),
            (c * r1 - px * w1, s_ * r1 - py * w1), (c * r0 - px * w0, s_ * r0 - py * w0)]

def build_blade(b):
    reset()
    s = b['shape']; n = 6 if s['kind'] == 'hex' else s['n']
    amp = max(s['amp'], 0.02)
    main_fn = lambda th: clean_outline(s, th)
    tipw = lambda th: clamp((clean_outline(s, th) - s['base']) / amp, 0, 1)      # 1 on the striking points
    def sub_fn(th):
        u = frac(th * n * 2 / TAU)
        return (s['base'] - 0.02) + 0.035 * (u / 0.25 if u < 0.25 else 1 - (u - 0.25) / 0.75)
    def frame_fn(th):
        u = frac(th * n / TAU)
        wing = smoothstep(0, 0.12, u) * (1 - smoothstep(0.32, 0.5, u)) if u < 0.5 else 0
        return 0.255 + wing * (s['base'] - 0.22)

    # --- gunmetal sub-ring underneath: thin, tucked under the main metal so the layers read from the side
    sub = solid_ring('sub', sub_fn, 0.2, lambda t, th: 0.034 - 0.012 * smoothstep(0.7, 1, t), z0=0.0, N=144, ts=[0, 0.7, 1])
    rotate_z(sub, math.pi / n); finish(sub, 0.003, 2)

    # --- main metal: plateau -> chamfered slope -> rim lip; striking points carry extra mass
    def metal_h(t, th):
        w = tipw(th)
        if t <= 0.5: return 0.07 + 0.004 * w
        if t <= 0.8: return lerp(0.07 + 0.004 * w, 0.05 + 0.016 * w, (t - 0.5) / 0.3)
        if t <= 0.84: return 0.05 + 0.016 * w - 0.008
        return lerp(0.042 + 0.016 * w, 0.036 + 0.012 * w, (t - 0.84) / 0.16)
    main = solid_ring('metal', main_fn, 0.205, metal_h, z0=0.022, N=176, ts=[0, 0.5, 0.8, 0.84, 1])
    cutters = []
    rr = s['base'] - 0.04
    if rr > 0.27:
        for i in range(n):
            a = i / n * TAU + math.pi / n
            cutters.append(prism('cut', slot_pts(0.248, min(rr, 0.31), a, min(0.3, 1.0 / n)), -0.1, 0.3))
    for i in range(n):
        a0 = i / n * TAU
        # twin machined grooves across the plateau toward each striking point
        for d in (-0.07, 0.07):
            cutters.append(prism('cut', strip_pts(a0 + 0.3 + d, 0.222, 0.29, 0.0045, 0.0045), 0.022 + 0.062, 0.3))
        # recessed hex bolt heads
        a = a0 + 0.3 + math.pi / n * 0.0
        cutters.append(prism('cut', hex_pts(math.cos(a0 - 0.25) * 0.232, math.sin(a0 - 0.25) * 0.232, 0.011, 0.3), 0.022 + 0.062, 0.3))
    boolean_diff(main, cutters)
    finish(main, 0.0045, 2, 28)

    # --- raised claws on each striking point: a sloped wedge (high at the hub side, diving to the tip)
    #     gives the blade a real 3D silhouette from the side instead of a flat disc
    NS = 720; samples = [clean_outline(s, i / NS * TAU) for i in range(NS)]
    peaks = [i for i in range(NS) if samples[i] >= samples[i - 1] and samples[i] > samples[(i + 1) % NS] and samples[i] > s['base'] + amp * 0.55]
    claws = []
    if s['amp'] >= 0.04:
        for pi in peaks:
            at = pi / NS * TAU; rt = samples[pi]
            back = 0.55 / n                                   # claw sweeps back against the spin
            pts = []
            for k in range(9):                                # outer edge follows the outline just inside it
                a = at - back * k / 8; pts.append((math.cos(a) * (clean_outline(s, a) - 0.018), math.sin(a) * (clean_outline(s, a) - 0.018)))
            for a, r in ((at - back, 0.262), (at - back * 0.35, 0.248), (at + 0.04, 0.262)):
                pts.append((math.cos(a) * r, math.sin(a) * r))
            cl = prism('claw', pts, 0.022 + 0.05, 0.022 + 0.1)
            for v in cl.data.vertices:                        # slope the top: tall at the hub, low at the tip
                if v.co.z > 0.022 + 0.08:
                    r = math.hypot(v.co.x, v.co.y)
                    v.co.z = 0.022 + 0.1 - 0.034 * smoothstep(0.26, rt - 0.01, r)
            finish(cl, 0.005, 2, 28); claws.append(cl)
    if claws: main = join([main] + claws, 'metal')

    # --- polymer frame: thick wings with a raised spine, seated into the metal (no air gap)
    def frame_h(t, th):
        if t <= 0.3: return 0.072
        if t <= 0.72: return lerp(0.072, 0.046, (t - 0.3) / 0.42)
        return lerp(0.046, 0.03, (t - 0.72) / 0.28)
    frame = solid_ring('frame', frame_fn, 0.19, frame_h, z0=0.082, N=128, ts=[0, 0.3, 0.72, 1])
    spines = []
    for i in range(n):
        a = i / n * TAU + (0.22 / n) * TAU + 0.06
        rt = frame_fn(a) - 0.035
        if rt > 0.27:
            sp = prism('spine', strip_pts(a, 0.232, rt, 0.012, 0.006), 0.082 + 0.02, 0.082 + 0.072 + 0.011)
            rf = frame_fn(a)
            for v in sp.data.vertices:                        # ride the frame's slope, 9 mm proud of the surface
                if v.co.z > 0.082 + 0.03:
                    tr = clamp((math.hypot(v.co.x, v.co.y) - 0.19) / (rf - 0.19), 0, 1)
                    v.co.z = 0.082 + frame_h(tr, a) + 0.009
            finish(sp, 0.004, 2, 30); spines.append(sp)
    rotate_z(frame, -0.22); finish(frame, 0.006, 2, 30)
    if spines:
        for sp in spines: rotate_z(sp, -0.22)
        frame = join([frame] + spines, 'frame')

    # --- translucent coloured inserts set into each wing (instead of a hazy full-ring overlay)
    gems = []
    for i in range(n):
        a = i / n * TAU + (0.22 / n) * TAU + 0.06 - 0.22
        rf = frame_fn(a + 0.22)
        if rf - 0.06 > 0.26:
            r0, r1 = 0.255, rf - 0.045
            t0 = (r0 - 0.19) / (rf - 0.19); zt = 0.082 + frame_h(t0, a) + 0.004
            g = prism('clear', [(x, y) for x, y in strip_pts(a + 0.17, r0, r1, 0.02, 0.012)], 0.082 + 0.02, zt)
            for v in g.data.vertices:                         # follow the frame's slope, sitting just proud of it
                if v.co.z > 0.082 + 0.03:
                    tr = clamp((math.hypot(v.co.x, v.co.y) - 0.19) / (rf - 0.19), 0, 1)
                    v.co.z = 0.082 + frame_h(tr, a) + 0.0025
            finish(g, 0.0025, 2, 30); gems.append(g)
    if gems: join(gems, 'clear')

    # --- centre bezel: 12-facet ring, stepped top, chamfered
    def chip_fn(th):
        u = frac(th * 12 / TAU)
        return 0.229 - 0.012 * smoothstep(0.35, 0.5, u) * (1 - smoothstep(0.5, 0.65, u))
    chip = solid_ring('chip', chip_fn, 0.17, lambda t, th: 0.07 if t < 0.45 else 0.058, z0=0.11, N=96, ts=[0, 0.45, 0.47, 1])
    finish(chip, 0.004, 2, 30)
    export(os.path.join(OUT, f"blade_{b['id']}.glb"))

# ------------------------------------------------------------------ ratchets
def text_mesh(txt, size, x, y, z, rot, depth):
    bpy.ops.object.text_add(location=(x, y, z)); t = bpy.context.object
    t.data.body = txt; t.data.size = size; t.data.extrude = depth; t.data.align_x = 'CENTER'; t.data.align_y = 'CENTER'
    t.rotation_euler[2] = rot
    bpy.ops.object.convert(target='MESH')
    return bpy.context.object

def build_ratchet(r):
    reset()
    h = r['h'] / 500; pr = r['prongs']; hb = h * 0.7
    def body_fn(th):
        u = frac(th * pr / TAU)
        return 0.236 - 0.014 * smoothstep(0.40, 0.46, u) * (1 - smoothstep(0.54, 0.60, u))
    # body: chamfered top shoulder, slight draft on the wall, lower lip
    body = solid_ring('body', body_fn, 0.12, lambda t, th: hb if t < 0.86 else hb - 0.012 * (t - 0.86) / 0.14, z0=0.006, N=120, ts=[0, 0.86, 1])
    cuts = []
    for i in range(pr * 2):                                   # vertical grip ribs moulded into the wall
        a = (i + 0.5) / (pr * 2) * TAU
        cuts.append(prism('cut', strip_pts(a, 0.228, 0.26, 0.007, 0.007), 0.006 + hb * 0.18, 0.006 + hb * 0.82))
    boolean_diff(body, cuts)
    finish(body, 0.004, 2, 30)
    # raised spec lettering on the top face between two teeth (e.g. "4-70")
    try:
        tw0 = clamp(TAU / pr * 0.42, 0.18, 0.9); amid = tw0 + (TAU / pr - tw0) / 2
        tx = text_mesh(r['id'], 0.042, math.cos(amid) * 0.2, math.sin(amid) * 0.2, 0.006 + hb, amid - math.pi / 2, 0.003)
        tx.name = 'label'; tx.data.name = 'label'
    except Exception as e:
        print('label skipped', e)
    # prongs: chunky ramps with a vertical locking face and chamfered edges
    tw = clamp(TAU / pr * 0.42, 0.18, 0.9)
    teeth = []
    for i in range(pr):
        a0 = i / pr * TAU
        bm = bmesh.new(); M = 12
        rows = []
        for rad in (0.165, 0.252):
            top, bot = [], []
            for j in range(M + 1):
                a = a0 + tw * j / M; t = j / M
                x, y = math.cos(a) * rad, math.sin(a) * rad
                z1 = hb + 0.006 + h * 0.06 + h * 0.36 * (0.25 + 0.75 * t)
                top.append(bm.verts.new((x, y, z1))); bot.append(bm.verts.new((x, y, hb - 0.004)))
            rows.append((top, bot))
        (ti, bi), (to, bo) = rows
        for j in range(M):
            bm.faces.new((ti[j], to[j], to[j + 1], ti[j + 1]))
            bm.faces.new((bi[j + 1], bo[j + 1], bo[j], bi[j]))
            bm.faces.new((bo[j], bo[j + 1], to[j + 1], to[j]))
            bm.faces.new((ti[j], ti[j + 1], bi[j + 1], bi[j]))
        bm.faces.new((bi[0], bo[0], to[0], ti[0])); bm.faces.new((ti[M], to[M], bo[M], bi[M]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        ob = new_obj('tooth', bm); finish(ob, 0.005, 2, 25); teeth.append(ob)
    join(teeth, 'teeth')
    export(os.path.join(OUT, f"ratchet_{r['id']}.glb"))

# ------------------------------------------------------------------ bits
BIT_LEN = {'flat': 0.25, 'rush': 0.25, 'rubber': 0.25, 'taper': 0.26, 'point': 0.26, 'ball': 0.26, 'needle': 0.28, 'hneedle': 0.34, 'lowflat': 0.22, 'accel': 0.25, 'orb': 0.25, 'htaper': 0.32, 'cone': 0.27, 'dome': 0.25, 'ring': 0.25, 'wideflat': 0.23, 'spike': 0.3, 'cup': 0.26}
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
    elif tip == 'lowflat': p += [(0.13, -0.15), (0.13, -L + 0.012), (0.12, -L), (0.001, -L)]
    elif tip == 'accel': p += [(0.125, -0.16), (0.118, -0.19), (0.128, -0.2), (0.11, -L + 0.012), (0.095, -L), (0.001, -L)]
    elif tip == 'orb':
        p += [(0.12, -0.15)] + [(math.cos(i / 10 * math.pi / 2) * 0.115 + 0.001, -L + 0.06 - math.sin(i / 10 * math.pi / 2) * 0.06) for i in range(11)]
    elif tip == 'htaper': p += [(0.11, -0.16), (0.08, -0.24), (0.045, -L + 0.012), (0.035, -L), (0.001, -L)]
    elif tip == 'cone': p += [(0.12, -0.16), (0.07, -L + 0.03), (0.02, -L + 0.004), (0.001, -L)]
    elif tip == 'dome':
        p += [(0.13, -0.15)] + [(math.cos(i / 10 * math.pi / 2) * 0.1 + 0.001, -L + 0.1 - math.sin(i / 10 * math.pi / 2) * 0.1) for i in range(11)]
    elif tip == 'ring': p += [(0.125, -0.16), (0.125, -L + 0.02), (0.115, -L), (0.07, -L), (0.06, -L + 0.015), (0.001, -L + 0.015)]
    elif tip == 'wideflat': p += [(0.14, -0.15), (0.14, -L + 0.01), (0.13, -L), (0.001, -L)]
    elif tip == 'spike': p += [(0.1, -0.15), (0.06, -0.2), (0.012, -L + 0.01), (0.003, -L)]
    elif tip == 'cup': p += [(0.12, -0.16), (0.1, -0.2), (0.09, -L + 0.03), (0.06, -L), (0.001, -L)]
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
    # split the lathe profile: everything below the shank is the replaceable tip (own material in game)
    ZS = -0.15
    up = [p for p in prof if p[1] >= ZS]; lo = [p for p in prof if p[1] < ZS]
    if lo:
        # interpolate the cut ring so body and tip meet exactly
        i = len(up); (r0, z0), (r1, z1) = prof[i - 1], prof[i]
        rc = lerp(r0, r1, (ZS - z0) / (z1 - z0)) if z1 != z0 else r1
        up = up + [(rc, ZS), (0.001, ZS)]; lo = [(0.001, ZS), (rc, ZS)] + lo
    body = lathe('body', up, 56, z_off=L)
    # moulded vertical ribs on the shank + a fine groove under the collar
    cut = []
    for i in range(12):
        a = i / 12 * TAU
        cut.append(prism('cut', strip_pts(a, 0.13, 0.17, 0.006, 0.006), L - 0.128, L - 0.078))
    cut.append(lathe('cut', [(0.19, -0.047), (0.21, -0.047), (0.21, -0.053), (0.19, -0.053)], 56, z_off=L))
    boolean_diff(body, cut)
    finish(body, 0.0035, 2, 30)
    if lo:
        tip = lathe('tip', lo, 56, z_off=L); finish(tip, 0.0, 1, weighted=False)
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
        if b['tip'] == 'accel':
            g2 = solid_ring('gear2', gear_fn, 0.12, lambda t, th: 0.022, z0=L - 0.185, K=1, N=teeth * 8)
            rotate_z(g2, math.pi / teeth); finish(g2, 0.003, 2, 40)
            for o in bpy.context.selected_objects: o.select_set(False)
            g.select_set(True); g2.select_set(True); bpy.context.view_layer.objects.active = g
            bpy.ops.object.join(); g.name = 'gear'; g.data.name = 'gear'
    else:
        g = lathe('guard', [(0.12, -0.10), (0.162, -0.10), (0.166, -0.115), (0.162, -0.13), (0.12, -0.13)], 96, z_off=L)
        finish(g, 0.0, 1, weighted=False)
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
