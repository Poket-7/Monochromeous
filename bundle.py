import os

def build_standalone():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    modular_html_path = os.path.join(base_dir, "index.modular.html")
    if not os.path.exists(modular_html_path):
        # copy index.html to index.modular.html
        with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
            base_html = f.read()
        with open(modular_html_path, "w", encoding="utf-8") as f:
            f.write(base_html)

    with open(modular_html_path, "r", encoding="utf-8") as f:
        html = f.read()
            
    with open(os.path.join(base_dir, "style.css"), "r", encoding="utf-8") as f:
        css = f.read()
    with open(os.path.join(base_dir, "js", "three.min.js"), "r", encoding="utf-8") as f:
        three_js = f.read()
    with open(os.path.join(base_dir, "js", "audio.js"), "r", encoding="utf-8") as f:
        audio_js = f.read()
    with open(os.path.join(base_dir, "js", "joystick.js"), "r", encoding="utf-8") as f:
        joystick_js = f.read()
    with open(os.path.join(base_dir, "js", "map.js"), "r", encoding="utf-8") as f:
        map_js = f.read()
    with open(os.path.join(base_dir, "js", "entity.js"), "r", encoding="utf-8") as f:
        entity_js = f.read()
    with open(os.path.join(base_dir, "js", "game.js"), "r", encoding="utf-8") as f:
        game_js = f.read()

    # Inlining CSS
    css_tag = "<style>\n" + css + "\n  </style>"
    html = html.replace('<link rel="stylesheet" href="style.css" />', css_tag)
    html = html.replace('<link rel="stylesheet" href="style.css">', css_tag)

    # Inlining Three.js
    three_tag = "<script>\n" + three_js + "\n  </script>"
    html = html.replace('<script src="js/three.min.js"></script>', three_tag)

    # Inlining Game Scripts
    combined_game_scripts = (
        "<!-- Self-Contained Bundled Game Scripts -->\n"
        "<script>\n"
        "// =========================================\n"
        "// audio.js\n"
        "// =========================================\n"
        + audio_js + "\n\n"
        "// =========================================\n"
        "// joystick.js\n"
        "// =========================================\n"
        + joystick_js + "\n\n"
        "// =========================================\n"
        "// map.js\n"
        "// =========================================\n"
        + map_js + "\n\n"
        "// =========================================\n"
        "// entity.js\n"
        "// =========================================\n"
        + entity_js + "\n\n"
        "// =========================================\n"
        "// game.js\n"
        "// =========================================\n"
        + game_js + "\n"
        "</script>"
    )

    scripts_block = """  <!-- Game Scripts -->
  <script src="js/audio.js"></script>
  <script src="js/joystick.js"></script>
  <script src="js/map.js"></script>
  <script src="js/entity.js"></script>
  <script src="js/game.js"></script>"""
  
    # Standardize line breaks for replacement
    html_normalized = html.replace("\r\n", "\n")
    scripts_block_normalized = scripts_block.replace("\r\n", "\n")
    
    if scripts_block_normalized in html_normalized:
        html_normalized = html_normalized.replace(scripts_block_normalized, combined_game_scripts)
    else:
        print("Fallback replacing individual scripts...")
        html_normalized = html_normalized.replace('<script src="js/audio.js"></script>', "<script>\n" + audio_js + "\n</script>")
        html_normalized = html_normalized.replace('<script src="js/joystick.js"></script>', "<script>\n" + joystick_js + "\n</script>")
        html_normalized = html_normalized.replace('<script src="js/map.js"></script>', "<script>\n" + map_js + "\n</script>")
        html_normalized = html_normalized.replace('<script src="js/entity.js"></script>', "<script>\n" + entity_js + "\n</script>")
        html_normalized = html_normalized.replace('<script src="js/game.js"></script>', "<script>\n" + game_js + "\n</script>")

    out_path = os.path.join(base_dir, "index.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html_normalized)
        
    print(f"Successfully generated standalone index.html: {len(html_normalized)} bytes")

if __name__ == "__main__":
    build_standalone()
