#!/usr/bin/env python3
"""
Flatten App Store icon by removing transparency and compositing on white background.
"""
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: PIL not found. Install with: pip3 install Pillow")
    sys.exit(1)

def flatten_icon(input_path: str, output_path: str, bg_color=(255, 255, 255)):
    """Flatten PNG by removing alpha and compositing on solid background."""
    try:
        img = Image.open(input_path).convert("RGBA")
        
        # Create background with same size
        background = Image.new("RGB", img.size, bg_color)
        
        # Composite image on background
        background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
        
        # Save as PNG without alpha
        background.save(output_path, "PNG")
        
        print(f"✓ Flattened icon saved: {output_path}")
        print(f"  Size: {Path(output_path).stat().st_size} bytes")
        
        # Verify no alpha
        verify = Image.open(output_path)
        if verify.mode == "RGB":
            print(f"  ✓ Confirmed: No transparency (mode: {verify.mode})")
        else:
            print(f"  ⚠ Warning: Image mode is {verify.mode} (expected RGB)")
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    input_file = "assets/branding/icons/appstore-icon-1024.png"
    output_file = "assets/branding/icons/appstore-icon-1024-flat.png"
    
    if not Path(input_file).exists():
        print(f"Error: Input file not found: {input_file}")
        sys.exit(1)
    
    print(f"Flattening: {input_file}")
    print(f"Background: white (#FFFFFF)")
    flatten_icon(input_file, output_file)
