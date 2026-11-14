"""Generate original fictional launch-vehicle surface maps; requires Pillow and numpy."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
root=Path(__file__).resolve().parents[1]/'public/models/launch-vehicle';root.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(42);n=2048
noise=rng.normal(0,.65,(n,n,1));base=np.clip(np.array([232,235,230])+noise,0,255).astype('uint8')
im=Image.fromarray(base);d=ImageDraw.Draw(im)
font_path='/System/Library/Fonts/Supplemental/Arial.ttf'
font=ImageFont.truetype(font_path,40);small=ImageFont.truetype(font_path,15)
for offset in [300,1324]:
 # Restrained identification, roll markers and service stencils.
 label=Image.new('RGBA',(660,74));ld=ImageDraw.Draw(label);ld.text((10,12),'АРХИТЕКТОР МИССИЙ',fill=(40,57,65),font=font)
 label=label.rotate(90,expand=True);im.paste(label,(offset,430),label)
 d.rounded_rectangle((offset-15,260,offset+90,330),radius=5,fill=(30,58,74))
 d.text((offset+4,272),'01',font=font,fill=(235,237,231))
 for y in [1180,1540]:
  d.rectangle((offset-25,y,offset+110,y+65),outline=(155,165,163),width=2)
  d.text((offset-16,y+12),'СЕРВИС',font=small,fill=(70,85,90))
  d.line((offset-15,y+47,offset+80,y+47),fill=(180,130,60),width=3)
 # Thin registration stripe, not a large decorative racing stripe.
 d.rectangle((offset-34,250,offset-30,1740),fill=(96,122,131))
im.save(root/'body-color.webp',quality=94)
rough=np.clip(rng.normal(158,3,(1024,1024)),0,255).astype('uint8');Image.fromarray(rough).save(root/'body-roughness.png')
bump=np.clip(rng.normal(128,4,(1024,1024)),0,255).astype('uint8');Image.fromarray(bump).filter(ImageFilter.GaussianBlur(.5)).save(root/'body-bump.png')
print('Generated original surface maps')
