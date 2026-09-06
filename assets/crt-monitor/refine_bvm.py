import bmesh

REAR_DEPTH_SCALE = 1.35
LOWER_FASCIA_EXTRA = .025
HANDLE_RADIUS = .0048
HANDLE_UPPER_LIFT = .012

def remove_parts(prefixes):
    for o in list(bpy.context.scene.objects):
        if any(o.name.startswith(p) for p in prefixes):
            bpy.data.objects.remove(o, do_unlink=True)

remove_parts(['CRT_ControlPanel', 'CRT_Buttons', 'CRT_Knobs', 'CRT_ControlTicks',
              'CRT_Trim', 'CRT_PowerSocket', 'CRT_StatusRing', 'CRT_StatusLight',
              'CRT_StatusDisplay', 'CRT_Handles', 'CRT_Vents', 'CRT_RearConnect', 'CRT_RearVents', 'CRT_CaseFasteners'])

for x in [-.217,.217]:
    path=[(-.170+HANDLE_UPPER_LIFT,.039),(-.170+HANDLE_UPPER_LIFT,.053)]
    for i in range(1,17):
        a=math.pi*.5*i/16
        path.append((-.177+HANDLE_UPPER_LIFT+.007*math.cos(a),.053+.007*math.sin(a)))
    path.append((-.214,.060))
    for i in range(1,17):
        a=math.pi*.5+math.pi*.5*i/16
        path.append((-.214+.007*math.cos(a),.053+.007*math.sin(a)))
    path.append((-.221,.021))
    vertices=[];faces=[];sides=32
    for j,(y,z) in enumerate(path):
        previous=path[max(0,j-1)];following=path[min(len(path)-1,j+1)]
        dy=following[0]-previous[0];dz=following[1]-previous[1]
        length=math.hypot(dy,dz)
        for i in range(sides):
            a=2*math.pi*i/sides;r=HANDLE_RADIUS
            vertices.append((x+r*math.cos(a),y-r*dz/length*math.sin(a),z+r*dy/length*math.sin(a)))
        if j:
            for i in range(sides):
                a=(j-1)*sides+i;b=(j-1)*sides+(i+1)%sides
                faces.append((a,a+sides,b+sides,b))
    mesh('CRT_Handles',vertices,faces,black)

plastic.diffuse_color=(.095,.103,.096,1)
plastic.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.095,.103,.096,1)
plastic.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.43
accent.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.06
accent.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.36
color_node=accent.node_tree.nodes.new('ShaderNodeVertexColor')
color_node.layer_name='HardwareTint'
accent.node_tree.links.new(color_node.outputs['Color'],accent.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

housing=bpy.data.objects['CRT_Housing']
bm=bmesh.new();bm.from_mesh(housing.data)
for coordinate,normal in [((0,0,.004),(0,0,1)),((0,-.171,0),(0,1,0))]:
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
        dist=.0000001,plane_co=coordinate,plane_no=normal)
cut=[f for f in bm.faces if f.calc_center_median().y<-.171 and f.calc_center_median().z>.004]
bmesh.ops.delete(bm,geom=cut,context='FACES')
for coordinate,normal in [((-.025,0,0),(1,0,0)),((.025,0,0),(1,0,0)),((0,.161,0),(0,1,0)),((0,.193,0),(0,1,0))]:
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
        dist=.0000001,plane_co=coordinate,plane_no=normal)
tally_cut=[f for f in bm.faces if -.025<f.calc_center_median().x<.025 and .161<f.calc_center_median().y<.193 and f.calc_center_median().z>.004]
bmesh.ops.delete(bm,geom=tally_cut,context='FACES')
bmesh.ops.dissolve_limit(bm,angle_limit=.0001,verts=list(bm.verts),edges=list(bm.edges),delimit=set())
bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4])
bm.to_mesh(housing.data);bm.free()
bpy.context.view_layer.objects.active=housing
bpy.ops.mesh.customdata_custom_splitnormals_clear()
loft('CRT_TallyRecess',[(.050,.032,.0003,.177,.043),(.041,.024,.0003,.177,.034)],plastic)
box('CRT_StatusDisplay',(0,.177,.0325),(.041,.024,.002),accent,.0004,3)
box('CRT_ControlPanel_Reveal',(0,-.204,.020),(.453,.061,.004),black,.002,3)
box('CRT_ControlPanel',(0,-.204,.023),(.450,.058,.003),plastic,.0012,3)

for col in range(3):
    for row in range(2):
        x=-.179+col*.023;y=-.194-row*.022
        box('CRT_Buttons_Socket',(x,y,.026),(.0165,.0155,.004),black,.001,3)
        box('CRT_Buttons',(x,y,.030),(.0125,.012,.007),accent,.0006,3)

for x in [-.108,-.087]:
    loft('CRT_TrimWell',[(.017,.048,.008,-.203,.026),(.015,.046,.007,-.203,.027),
        (.012,.043,.006,-.203,.0255)],plastic).location.x=x
    for y in [-.188,-.203,-.218]:
        cylinder('CRT_TrimSocket',x,y,.026,.0048,.0014,black,32)
        cylinder('CRT_TrimBottom',x,y,.0268,.0032,.0004,black,24)

for k in range(5):
    x=-.047+k*.034
    cylinder('CRT_Knobs_Collar',x,-.204,.026,.0117,.003,black,64)
    profile=[(.0085,.027),(.010,.029),(.010,.038),(.0093,.040),(.0088,.041),(.007,.0407),(.004,.0403),(0,.0402)]
    verts=[];faces=[];n=96
    for ring,(radius,z) in enumerate(profile):
        for i in range(n):
            a=2*math.pi*i/n
            r=radius+(.00035 if ring in [1,2] and i%2==0 else 0)
            verts.append((x+r*math.cos(a),-.204+r*math.sin(a),z))
    for ring in range(len(profile)-1):
        for i in range(n):
            a=ring*n+i;b=ring*n+(i+1)%n
            faces.append((a,b,b+n,a+n))
    mesh('CRT_Knobs',verts,faces,black)
    cylinder('CRT_KnobPointer',x,-.198,.041,.0011,.0003,black,20)
    for px,py in [(x,-.187),(x-.012,-.215),(x+.012,-.215)]:
        cylinder('CRT_ControlTicks',px,py,.025,.00055,.0002,accent,12)

box('CRT_PowerSocket',(.181,-.204,.026),(.020,.021,.004),black,.001,3)
box('CRT_Buttons_Power',(.181,-.203,.030),(.015,.016,.007),accent,.0007,3)
cylinder('CRT_StatusRing',.154,-.203,.025,.0028,.001,black,32)
led=cylinder('CRT_StatusLight',.154,-.203,.026,.0019,.001,accent,32)
led['tint']=[.09,.8,.004,1]

font=bpy.data.fonts.load('C:/Windows/Fonts/arial.ttf')
def label(text,x,y,size,z=.0252):
    c=bpy.data.curves.new('Panel lettering','FONT');c.body=text;c.font=font
    c.size=size;c.align_x='CENTER';c.align_y='CENTER';c.space_line=.85;c.resolution_u=2
    o=bpy.data.objects.new('CRT_Legends',c);bpy.context.collection.objects.link(o)
    o.location=(x,y,z)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
    bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    o.data.materials.append(accent)
    return o

for x,text in [(-.179,'A/B\nSDI/RGB'),(-.156,'LINE/\nRGB'),(-.133,'SYNC\nINT/EXT')]:label(text,x,-.1815,.0031)
for x,text in [(-.179,'BLUE\nONLY'),(-.156,'UNDER\nSCAN'),(-.133,'H/V\nDELAY')]:label(text,x,-.227,.0028)
label('BIAS',-.108,-.178,.0033);label('GAIN',-.087,-.178,.0033)
for y,text in [(-.188,'R'),(-.203,'G'),(-.218,'B')]:label(text,-.0975,y,.003)
for k,text in enumerate(['APER','BRIGHT','CHROMA','PHASE','CONTR']):label(text,-.047+k*.034,-.1795,.0032)
label('POWER',.176,-.18,.0032)
label('ON  OFF',.181,-.222,.0027)
box('CRT_PowerLegend',(.154,-.187,.0252),(.0004,.012,.0002),accent,0)
box('CRT_PowerLegend',(.161,-.181,.0252),(.014,.0004,.0002),accent,0)
label('HR',-.19,.177,.009,.044)
label('Trinitron',-.167,.176,.004,.044)
label('Serial Digital Interface',.157,.177,.0039,.044)

bpy.ops.preferences.addon_enable(module='io_curve_svg')
bpy.ops.object.select_all(action='DESELECT')
before=set(bpy.context.scene.objects)
svg=(OUT/'sony-logo.svg').read_text().replace('v -29.64479 c 24.6016', 'z M 456.0129,195.63518 c 24.6016')
import tempfile
with tempfile.NamedTemporaryFile(suffix='.svg',mode='w',delete=False) as source:
    source.write(svg);source_path=source.name
bpy.ops.import_curve.svg(filepath=source_path)
Path(source_path).unlink()
logos=[o for o in bpy.context.scene.objects if o not in before and o.type=='CURVE']
for o in logos:
    o.select_set(True);o.data.resolution_u=24
bpy.context.view_layer.objects.active=logos[0]
bpy.ops.object.convert(target='MESH');bpy.ops.object.join()
logo=bpy.context.object;logo.name='CRT_SonyBadge'
points=[logo.matrix_world@v.co for v in logo.data.vertices]
low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
factor=.068/(high.x-low.x);center=(low+high)/2
for v,p in zip(logo.data.vertices,points):v.co=Vector(((p.x-center.x)*factor,(p.y-center.y)*factor-.163,.045))
logo.matrix_world=Matrix.Identity(4);logo.data.materials.clear();logo.data.materials.append(accent)
bm=bmesh.new();bm.from_mesh(logo.data)
xcenter=(456.0129-640)*factor
removed=[v for v in bm.verts if (305-640)*factor<v.co.x<(607-640)*factor]
bmesh.ops.delete(bm,geom=removed,context='VERTS')
outer=[];inner=[]
for i in range(192):
    a=2*math.pi*i/192
    outer.append(bm.verts.new((xcenter+150.15*factor*math.cos(a),-.163+112.64*factor*math.sin(a),.045)))
    inner.append(bm.verts.new((xcenter+86.55*factor*math.cos(a),-.163+83*factor*math.sin(a),.045)))
for i in range(192):
    j=(i+1)%192
    bm.faces.new((outer[i],outer[j],inner[j],inner[i]))
bm.to_mesh(logo.data);bm.free()

solid=logo.modifiers.new('Raised badge','SOLIDIFY');solid.thickness=.00065
bpy.ops.object.modifier_apply(modifier=solid.name)
for face in logo.data.polygons:
    face.use_smooth=abs(face.normal.z)<.99
logo['tint']=[.86,.86,.82,1]


for side in [-1,1]:
    verts=[];faces=[]
    for band in range(5):
        y=.139-band*.035 if band<3 else -.07-(band-3)*.035
        for j in range(42):
            z=-.315+j*.0048;a=len(verts);x=side*.2302
            verts.extend([(x,y-.012,z-.00055),(x,y+.012,z-.00055),(x,y+.012,z+.00055),(x,y-.012,z+.00055)])
            faces.append(tuple(a+i for i in ([0,1,2,3] if side>0 else [3,2,1,0])))
    mesh('CRT_Vents',verts,faces,black)

for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    if o.name=='CRT_StatusDisplay':o['tint']=[.28,.30,.22,1]
    if accent in list(o.data.materials):
        color=o.data.color_attributes.new(name='HardwareTint',type='BYTE_COLOR',domain='CORNER')
        for d in color.data:d.color=o.get('tint',[.64,.66,.57,1])
    if o.name.startswith(('CRT_Rear','CRT_Stand')):
        bpy.context.view_layer.objects.active=o
        m=o.modifiers.new('Hidden surface simplification','DECIMATE');m.ratio=.3
        bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    for vertex in o.data.vertices:
        if vertex.co.z<-.03:
            vertex.co.z=-.03+(vertex.co.z+.03)*REAR_DEPTH_SCALE
        if o.name.startswith('CRT_Handles'):
            vertex.co.y-=LOWER_FASCIA_EXTRA
        elif o.name=='CRT_SonyBadge':
            vertex.co.y-=LOWER_FASCIA_EXTRA*.5
        else:
            t=max(0,min(1,(-vertex.co.y-.156)/.015))
            vertex.co.y-=LOWER_FASCIA_EXTRA*t

    bm=bmesh.new();bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=.0000001)
    bm.to_mesh(o.data);bm.free()
    if o.name.startswith(('CRT_Housing','CRT_Bezel','CRT_ControlBay','CRT_ControlPanel')):
        o.data.update()
        for face in o.data.polygons:
            points=[o.data.vertices[i].co for i in face.vertices]
            planar_axis=any(max(p[axis] for p in points)-min(p[axis] for p in points)<.000001 for axis in range(3))
            if planar_axis or face.area>.000025:
                face.use_smooth=False


bpy.ops.object.select_all(action='DESELECT')
