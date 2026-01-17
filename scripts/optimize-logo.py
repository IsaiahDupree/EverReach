#!/usr/bin/env python3
"""
Optimize EverReach logo for app icon
- Removes excess white padding
- Centers logo with minimal padding (10% on each side)
- Outputs optimized 1024x1024 PNG
"""

from PIL import Image
import sys

def optimize_logo(input_path, output_path):
    """Optimize logo by removing excess padding and centering"""
    
    # Open the image
    img = Image.open(input_path)
    
    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Get the bounding box of non-white pixels
    # We'll consider anything that's not pure white as content
    bbox = None
    pixels = img.load()
    width, height = img.size
    
    # Find bounds
    left, top, right, bottom = width, height, 0, 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # If pixel is not white or has transparency
            if not (r > 250 and g > 250 and b > 250) or a < 250:
                left = min(left, x)
                top = min(top, y)
                right = max(right, x)
                bottom = max(bottom, y)
    
    # Add some padding (10% on each side = 80% logo, 20% padding total)
    content_width = right - left
    content_height = bottom - top
    max_dimension = max(content_width, content_height)
    
    # Target is 80% of canvas (leaving 10% padding on each side)
    target_size = int(1024 * 0.80)  # 819 pixels for logo
    
    # Scale factor
    scale = target_size / max_dimension
    
    # Crop to content
    cropped = img.crop((left, top, right + 1, bottom + 1))
    
    # Resize maintaining aspect ratio
    new_width = int(content_width * scale)
    new_height = int(content_height * scale)
    resized = cropped.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Create new 1024x1024 white canvas
    result = Image.new('RGBA', (1024, 1024), (255, 255, 255, 255))
    
    # Center the resized logo
    paste_x = (1024 - new_width) // 2
    paste_y = (1024 - new_height) // 2
    
    # Paste the logo
    result.paste(resized, (paste_x, paste_y), resized)
    
    # Save
    result.save(output_path, 'PNG', optimize=True)
    
    print(f"✅ Optimized logo saved!")
    print(f"   Original content: {content_width}×{content_height}")
    print(f"   Scaled to: {new_width}×{new_height}")
    print(f"   Canvas: 1024×1024")
    print(f"   Logo fills: {int((new_width/1024)*100)}% width, {int((new_height/1024)*100)}% height")
    print(f"   Saved to: {output_path}")

if __name__ == '__main__':
    input_file = '../assets/branding/logo-source-1024.png'
    output_file = '../assets/branding/logo-optimized-1024.png'
    
    try:
        optimize_logo(input_file, output_file)
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nMake sure PIL/Pillow is installed:")
        print("  pip3 install Pillow")
        sys.exit(1)
