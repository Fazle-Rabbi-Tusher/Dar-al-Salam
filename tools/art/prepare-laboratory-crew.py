"""Import the generated 8x4 crew sheet; preserve faces and feet, pack native strips.
Usage: python tools/art/prepare-laboratory-crew.py path/to/generated-sheet.png
Requires Pillow. Connected background removal preserves enclosed white lab coats.
"""
from collections import deque
from pathlib import Path
import json, shutil, sys
from PIL import Image
source=Path(sys.argv[1]); root=Path(__file__).resolve().parents[2]
original=root/'art/sprites/source/laboratory-crew.png'
if source.resolve()!=original.resolve(): shutil.copyfile(source,original)
im=Image.open(source).convert('RGBA'); W,H=im.size
cells=[]
for row in range(4):
    rowcells=[]
    for col in range(8):
        cell=im.crop((round(col*W/8),round(row*H/4),round((col+1)*W/8),round((row+1)*H/4)))
        w,h=cell.size; px=cell.load(); bg=set(); q=deque()
        def blank(x,y):
            r,g,b,a=px[x,y]
            return min(r,g,b)>234 and max(r,g,b)-min(r,g,b)<22
        for x in range(w):q.extend([(x,0),(x,h-1)])
        for y in range(h):q.extend([(0,y),(w-1,y)])
        while q:
            x,y=q.popleft()
            if (x,y) in bg or not(0<=x<w and 0<=y<h) or not blank(x,y):continue
            bg.add((x,y));q.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
        for y in range(h):
            for x in range(w):
                r,g,b,a=px[x,y];px[x,y]=(r,g,b,0 if (x,y)in bg else 255)
        # Drop disconnected specks in the gutter; never erase a colour globally.
        remaining={(x,y)for y in range(h)for x in range(w)if px[x,y][3]}
        components=[]
        while remaining:
            seed=next(iter(remaining));found={seed};remaining.remove(seed);q=deque([seed])
            while q:
                x,y=q.popleft()
                for n in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                    if n in remaining:remaining.remove(n);found.add(n);q.append(n)
            components.append(found)
        large=set().union(*(c for c in components if len(c)>20))
        for y in range(h):
            for x in range(w):
                if (x,y)not in large:px[x,y]=(0,0,0,0)
        box=cell.getbbox()
        if not box:raise ValueError(f'empty cell {row},{col}')
        crop=cell.crop(box)
        rowcells.append(crop)
    # Same scale across all four poses and both views; shoe anchors handle translation.
    scale=(264 if row<2 else 210)/max(c.height for c in rowcells)
    packed=[]
    for i,crop in enumerate(rowcells):
        out=Image.new('RGBA',(224,336));crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.NEAREST)
        if i<4:crop=crop.transpose(Image.Transpose.FLIP_LEFT_RIGHT) # front SE
        p=crop.load();foot=[x for y in range(max(0,crop.height-10),crop.height)for x in range(crop.width)if p[x,y][3]>128]
        anchor=sum(foot)/len(foot)
        x=round(112-anchor);y=320-crop.height
        if x<0 or x+crop.width>224:raise ValueError('Sprite clips cell')
        out.alpha_composite(crop,(x,y));packed.append(out)
    cells.append(packed)
roles={'lab-chemistry-operator-1':0,'lab-chemistry-operator-2':1,'lab-biology-researcher-1':0,'lab-biology-researcher-2':1,'lab-architect-drafter-1':2,'lab-architect-drafter-2':3,'lab-architect-cad':2}
for c in json.loads((root/'content/ambient/laboratories.json').read_text()):
    frames=cells[roles[c['id']]];name=c['id']
    frames[0].transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(root/f'art/sprites/{name}.png') # front SW fallback convention
    frames[4].transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(root/f'art/sprites/{name}-back.png')
    keys={s['action']+('@'+s['prop']if s.get('prop')else '')for s in c['script']}
    for key in keys:
        count=4 if key.split('@')[0]in ('pour','write')else 1
        for view,offset in [('SE',0),('NE',4)]:
            strip=Image.new('RGBA',(224*count,336))
            for n in range(count):strip.alpha_composite(frames[offset+n],(224*n,0))
            strip.save(root/f'art/sprites/anim/{name}__{key}_{view}.png')
print('Prepared 7 workers with 4 original identities, front/rear working strips and fixed shoe anchors.')
