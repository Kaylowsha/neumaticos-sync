import csv, re

# ── Tablas de referencia ──────────────────────────────────────────────────────

LOAD_INDEX = {
    "80":850,"82":475,"84":500,"86":530,"87":545,"88":560,"90":600,"91":615,
    "92":630,"93":650,"94":670,"95":690,"96":710,"97":730,"98":750,"99":775,
    "100":800,"101":825,"102":850,"103":875,"104":900,"105":925,"106":950,
    "107":975,"108":1000,"109":1030,"110":1060,"111":1090,"112":1120,
    "113":1150,"114":1180,"115":1215,"116":1250,"117":1285,"118":1320,
    "119":1360,"120":1400,"121":1450,"122":1500,"123":1550,"124":1600,
}

SPEED_CODE = {
    "Q":160,"R":170,"S":180,"T":190,"H":210,"V":240,"W":270,"Y":300,
}

# ── Parser de título ──────────────────────────────────────────────────────────

def parse_title(title):
    t = title.strip()
    parts = t.split()
    brand = parts[0] if parts else "Neumático"
    if len(parts) > 1 and parts[1].upper() in ("TIRE","TYRE"):
        brand = parts[0] + " " + parts[1]
        parts = parts[2:]
    else:
        parts = parts[1:]

    # medida
    size_str = parts[0] if parts else ""
    ancho = perfil = aro = ""
    m = re.search(r'(\d{3})[/\\](\d{2,3})[/\\]?R?(\d{2})', size_str, re.I)
    if m:
        ancho, perfil, aro = m.group(1), m.group(2), m.group(3)
    else:
        m2 = re.search(r'(\d{3})\s*R(\d{2})', size_str, re.I)
        if m2:
            ancho, aro = m2.group(1), m2.group(2)

    full_title = title
    is_commercial = bool(re.search(r'\d+C\b', full_title, re.I))
    is_at = bool(re.search(r'\bAT\b|\bAT\d', full_title, re.I))
    is_mt = bool(re.search(r'\bMT\b|\bMT\d', full_title, re.I))
    is_hp = bool(re.search(r'\bHP\b|\bSA37\b|\bADVANTEX\b|\bSPORT\b', full_title, re.I))

    # índice de carga y velocidad
    load_idx = speed_code = ""
    lv = re.search(r'(\d{2,3})[/\\]?(\d{2,3})([QRSTUVWY])\b', full_title)
    if lv:
        load_idx = lv.group(1)
        speed_code = lv.group(3)
    else:
        lv2 = re.search(r'(\d{2,3})([QRSTUVWY])\b', full_title)
        if lv2:
            load_idx = lv2.group(1)
            speed_code = lv2.group(2)

    size_display = f"{ancho}/{perfil}/R{aro}" if perfil else f"{ancho}/R{aro}" if aro else size_str
    load_kg = LOAD_INDEX.get(load_idx, "")
    speed_kmh = SPEED_CODE.get(speed_code.upper(), "") if speed_code else ""

    return {
        "brand": brand,
        "size": size_display,
        "aro": aro,
        "ancho": ancho,
        "perfil": perfil,
        "load_idx": load_idx,
        "load_kg": load_kg,
        "speed_code": speed_code.upper() if speed_code else "",
        "speed_kmh": speed_kmh,
        "is_commercial": is_commercial,
        "is_at": is_at,
        "is_mt": is_mt,
        "is_hp": is_hp,
        "model": " ".join(t.split()[1:]).strip() if t else "",
    }

# ── Generadores de texto ──────────────────────────────────────────────────────

def vehicle_type(p):
    if p["is_commercial"]:
        return "furgonetas, camionetas comerciales y vehículos de carga"
    if p["is_at"] or p["is_mt"]:
        return "camionetas 4x4, SUV y pickups que circulan por asfalto y terreno"
    aro = int(p["aro"]) if p["aro"].isdigit() else 15
    perfil = int(p["perfil"]) if p["perfil"].isdigit() else 55
    ancho = int(p["ancho"]) if p["ancho"].isdigit() else 205
    # perfil alto (≥70) en aro 15-16 = pickup/SUV/camioneta
    if perfil >= 70 and aro >= 15:
        return "SUV, pickups y camionetas de uso intensivo"
    if aro >= 17:
        return "SUV, pickups y camionetas de uso intensivo"
    if aro <= 13:
        return "automóviles compactos y utilitarios pequeños"
    return "automóviles de turismo, sedanes y hatchbacks"

def terrain_desc(p):
    if p["is_mt"]:
        return "off-road en barro, tierra y superficies irregulares"
    if p["is_at"]:
        return "condiciones mixtas de asfalto y caminos sin pavimentar"
    if p["is_hp"]:
        return "carretera a alta velocidad con excelente agarre y precisión de manejo"
    if p["is_commercial"]:
        return "uso urbano e interurbano bajo carga constante"
    return "ciudad y carretera con conducción confortable y segura"

def make_excerpt(p, full_title):
    brand = p["brand"]
    size = p["size"]
    model_part = full_title.replace(brand, "").replace(size.replace("/R", " R").replace("/", "/"), "").strip()

    veh = vehicle_type(p)
    terrain = terrain_desc(p)

    load_sentence = ""
    if p["load_kg"] and p["speed_kmh"]:
        load_sentence = (f" Su índice de carga ({p['load_idx']}) soporta hasta {p['load_kg']} kg por neumático"
                         f" y el código de velocidad ({p['speed_code']}) permite hasta {p['speed_kmh']} km/h.")
    elif p["load_kg"]:
        load_sentence = f" Con índice de carga {p['load_idx']}, soporta hasta {p['load_kg']} kg por neumático."

    if p["is_at"]:
        main = (f"{full_title} es un neumático all-terrain diseñado para {veh}, "
                f"ofreciendo tracción confiable tanto en asfalto como en caminos de tierra.")
    elif p["is_mt"]:
        main = (f"{full_title} es un neumático mud-terrain pensado para {veh}, "
                f"con una banda de rodadura agresiva que maximiza el agarre en terrenos difíciles.")
    elif p["is_commercial"]:
        main = (f"{full_title} es un neumático comercial diseñado para {veh}, "
                f"combinando durabilidad y estabilidad bajo carga constante.")
    elif p["is_hp"]:
        main = (f"{full_title} es un neumático de alto rendimiento ideal para {veh}, "
                f"diseñado para ofrecer precisión de manejo y agarre superior a alta velocidad.")
    else:
        main = (f"{full_title} es un neumático radial diseñado para {veh}, "
                f"ofreciendo un rendimiento equilibrado entre comodidad, seguridad y durabilidad.")

    return main + load_sentence + f" Ideal para {terrain}."


def make_content(p, full_title):
    brand = p["brand"]
    size = p["size"]
    veh = vehicle_type(p)
    terrain = terrain_desc(p)

    load_detail = ""
    if p["load_kg"] and p["speed_kmh"]:
        load_detail = (f" Con un índice de carga de {p['load_idx']} ({p['load_kg']} kg por neumático) "
                       f"y código de velocidad {p['speed_code']} (hasta {p['speed_kmh']} km/h),")
    elif p["load_kg"]:
        load_detail = f" Con índice de carga {p['load_idx']} ({p['load_kg']} kg por neumático),"

    if p["is_at"]:
        tread = ("Su diseño de banda de rodadura all-terrain combina bloques robustos y canales anchos "
                 "que evacúan el barro y el agua con eficiencia, garantizando tracción en asfalto y "
                 "caminos sin pavimentar.")
        constr = ("La construcción radial con correas de acero refuerza la estabilidad y la resistencia "
                  "a las perforaciones, fundamental en terrenos irregulares.")
    elif p["is_mt"]:
        tread = ("Su patrón de banda agresivo con bloques grandes y espacio entre tacos maximiza el agarre "
                 "en barro, arena y rocas, ofreciendo tracción superior en los terrenos más exigentes.")
        constr = ("La construcción robusta con flancos reforzados protege contra cortes y deformaciones "
                  "en terrenos abrasivos.")
    elif p["is_commercial"]:
        tread = ("El diseño de banda de rodadura con costillas continuas proporciona estabilidad y "
                 "desgaste uniforme bajo carga, reduciendo el costo de operación a largo plazo.")
        constr = ("La carcasa de construcción robusta con capas adicionales de poliéster y correas de "
                  "acero asegura integridad estructural incluso bajo carga máxima sostenida.")
    elif p["is_hp"]:
        tread = ("Su banda de rodadura asimétrica de compuesto de sílice proporciona agarre excepcional "
                 "en seco y mojado, con bloques de hombro reforzados para mayor estabilidad en curvas.")
        constr = ("La construcción de baja sección lateral y correas de acero de alta resistencia "
                  "minimizan la deformación lateral a alta velocidad, mejorando la respuesta de dirección.")
    else:
        tread = ("Su banda de rodadura simétrica con canales longitudinales y transversales garantiza "
                 "una tracción sólida en pavimento seco y húmedo, reduciendo el riesgo de aquaplaning.")
        constr = ("La construcción radial con carcasa de poliéster y correas de acero combina comodidad "
                  "de marcha con durabilidad, prolongando la vida útil del neumático.")

    opening = (f"{full_title} es un neumático diseñado específicamente para {veh}."
               f"{load_detail} ofrece un rendimiento óptimo en {terrain}. ")

    return opening + tread + " " + constr + (
        " Su relación calidad-precio lo convierte en una opción confiable para conductores que buscan "
        "seguridad y durabilidad en cada kilómetro recorrido."
    )

# ── Main ──────────────────────────────────────────────────────────────────────

def clean(t):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>|&nbsp;', '', t)).strip()

with open('InventarioWebNFP1_fixed.csv', encoding='utf-8', newline='') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    rows = list(reader)

generated = 0
for r in rows:
    if clean(r.get('post_content', '')):
        continue  # ya tiene descripción
    title = r.get('post_title', '').strip()
    if not title:
        continue
    p = parse_title(title)
    r['post_content'] = make_content(p, title)
    r['post_excerpt'] = make_excerpt(p, title)
    generated += 1
    print(f"  ✓ {r['sku']} | {title[:55]}")

with open('InventarioWebNFP1_fixed.csv', 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"\nGeneradas: {generated} descripciones → InventarioWebNFP1_fixed.csv")
