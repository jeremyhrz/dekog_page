/**
 * Conocimiento del negocio que no está en src/data/productos.js: telas, descripción y estilo de
 * cada modelo, materiales y especificaciones. Fuentes: catálogos oficiales «CATÁLOGO CAMAS DEKOG
 * 2026» y «CATÁLOGO MOBILIARIO DEKOG», y los muestrarios de telas que envió Dekog el 2026-10-06
 * (con sus mensajes). Los colores son los que se ven en las fotos de los muestrarios: el asistente
 * los da como referencia y el tono exacto se confirma con la muestra.
 */

export const telas = {
  incluidas: [
    { nombre: 'Coral', textura: 'aterciopelada lisa, de pelo corto', beneficios: [], colores: ['blanco', 'crema', 'beige', 'gris perla', 'gris oscuro', 'negro'] },
    { nombre: 'Focus', textura: 'bouclé tipo borreguito', beneficios: [], colores: ['blanco hueso', 'arena', 'beige claro', 'blanco', 'gris jaspeado', 'negro'] },
    { nombre: 'Liss', textura: 'terciopelo liso con brillo suave', beneficios: [], colores: ['blanco', 'crema', 'beige grisáceo', 'rosa palo', 'gris medio', 'gris oscuro', 'azul marino', 'negro'] },
    { nombre: 'Persea', textura: 'tipo gamuza, con un leve efecto envejecido', beneficios: [], colores: ['blanco hueso', 'beige claro', 'arena', 'topo', 'caramelo', 'gris perla', 'gris oscuro'] },
    { nombre: 'Cartago', textura: 'tipo bouclé', beneficios: ['antifluido: repele líquidos, polvo y salpicaduras accidentales'], colores: ['blanco', 'blanco hueso', 'marfil', 'beige', 'beige grisáceo', 'topo', 'terracota', 'verde menta', 'verde musgo', 'azul marino', 'gris perla', 'gris oscuro', 'negro'] },
    { nombre: 'Mirandela', textura: 'terciopelo con relieve, como pinceladas', beneficios: ['pet friendly: minimiza el enganche de las uñas de las mascotas', 'antifluido: repele líquidos, polvo y salpicaduras accidentales'], colores: ['gris perla', 'beige arena', 'caqui', 'malva', 'verde agua', 'topo', 'gris medio', 'gris carbón'] },
    { nombre: 'Zaga', textura: 'tejido jaspeado de trama cruzada', beneficios: ['alta solidez al frote', 'resistencia al rasgado y a la rotura'], colores: ['marfil', 'beige claro', 'arena dorada', 'topo', 'chocolate', 'gris medio', 'gris oscuro', 'azul petróleo', 'azul marino', 'lila', 'salmón', 'rojo'] },
    { nombre: 'Cedritos', textura: 'aterciopelada, con efecto de cuero envejecido', beneficios: ['pet friendly: minimiza el enganche de las uñas de las mascotas'], colores: ['topo claro', 'beige grisáceo', 'café con leche', 'gris perla', 'gris medio', 'gris grafito', 'azul acero', 'azul marino', 'lila', 'vino tinto'] },
  ],
  premium: [
    { nombre: 'Loft', textura: 'felpa suave de rizo muy corto', beneficios: ['antifluido: repele líquidos y polvo'], colores: ['blanco hueso', 'crema', 'beige', 'topo claro', 'topo', 'gris perla', 'rosa palo', 'verde azulado', 'verde petróleo', 'azul petróleo', 'gris medio', 'gris oscuro', 'negro'] },
    { nombre: 'Akita', textura: 'bouclé de rizo grueso, jaspeado', beneficios: [], colores: ['blanco hueso', 'gris perla', 'beige', 'topo claro', 'gris arena', 'terracota', 'verde bosque', 'gris medio', 'gris oscuro', 'azul grisáceo', 'azul marino'] },
    { nombre: 'Semicuero (colección premium)', textura: 'liso, tipo cuero', beneficios: [], colores: ['rojo intenso', 'beige tostado', 'verde oliva', 'gris azulado', 'verde bosque', 'caramelo', 'azul marino', 'rojo ladrillo'] },
  ],
};

/** Texto de telas para el prompt. */
export function telasParaPrompt() {
  const linea = (t) => `- ${t.nombre}: ${t.textura}${t.beneficios.length ? `. ${t.beneficios.join('; ')}` : ''}. Tonos de referencia: ${t.colores.join(', ')}.`;
  return [
    'TELAS INCLUIDAS en el precio de las CAMAS (confirmado por Dekog). En sofás y otros muebles el catálogo dice que el',
    'tapizado se elige "de nuestro catálogo de textiles": si una tela concreta tiene costo en un sofá, lo confirma una asesora.',
    ...telas.incluidas.map(linea),
    'TELAS PREMIUM, con recargo. En CAMAS el recargo es según la medida: Individual +REF 80, Matrimonial +REF 100,',
    'Queen +REF 120, King +REF 150. En sofás, puffs y demás muebles ese recargo lo confirma una asesora.',
    ...telas.premium.map(linea),
    'Hay además un terciopelo brillante con dibujo de cuadrícula (incluido) cuyo nombre confirma una asesora.',
  ].join('\n');
}

/**
 * Descripción y estilo de cada modelo según los catálogos 2026, por id de productos.js. Se rellena
 * con lo que dice el catálogo, sin adornos: el asistente puede reformularlo, no inventar.
 */
export const fichas = {
  1: "Sofá seccional de cojines rectos; disponible en individual, 2 y 3 puestos y modular en L. Puff a juego opcional (+REF 200). No confundir con la mesa de noche Amsterdam.",
  3: "Sofá curvo de 2 puestos (170 cm) con respaldo de canales verticales.",
  4: "Lo más destacado es su panel protector en forma de L, que funciona a la vez como cabecero y lateral, compuesto por paneles segmentados con terminaciones redondeadas. Estilo: Funcionalidad envolvente con estética de geometría suave.",
  5: "Sofá curvo envolvente de 3 puestos (280 cm), con un extremo redondeado tipo chaise.",
  6: "Su cabecero está dividido en tres grandes paneles rectangulares acolchados, que le dan estructura y un ritmo sutil sin perder la limpieza del diseño. Estilo: Contemporáneo minimalista.",
  7: "Su cabecero está formado por grandes bloques rectangulares acolchados que se extienden en horizontal, aportando orden arquitectónico y amplitud al diseño. Estilo: Minimalismo contemporáneo y lujo silencioso.",
  8: "Toda la estructura, base y cabecero, tiene un aspecto redondeado y acolchado que busca transmitir una sensación de suavidad y confort extremo. Estilo: Estética volumétrica con diseño orgánico y curvilíneo.",
  9: "Cabecero segmentado en paneles verticales de distintos anchos, con un diseño extendido que abarca el ancho de la pared y funciona como un elemento de mobiliario arquitectónico a medida. Estilo: Lujo silencioso y minimalismo contemporáneo. El cabecero se extiende al ancho de la pared.",
  10: "Cabecero y base compuestos por bloques rectangulares que crean un patrón geométrico, con vinil de efecto metalizado que añade contraste y refinamiento. Estilo: Lujo contemporáneo con acentos metálicos. Lleva vinil con efecto metalizado.",
  11: "Su cabecero tiene un patrón de costuras verticales que forman canales o paneles acolchados, lo que aporta ritmo visual y una sensación de altura y orden. Estilo: Estilo nórdico o escandinavo con inclinación minimalista e industrial elegante.",
  12: "Pieza redonda capitoné de 1 puesto (60 cm), con respaldo envolvente y cojines, tipo sillón redondo.",
  13: "Puff redondo capitoné de 1 puesto (60 cm), con aro metálico en la base.",
  15: "Puff rectangular capitoné de 1 puesto (60 cm), con base oscura.",
  18: "Sofá grande semicircular de módulos acolchados redondeados, 4 puestos (270 cm).",
  19: "Sofá modular de bloques acolchados redondeados; en individual (70 cm) y modular en L o en U. Puff a juego opcional (+REF 130). No confundir con la mesa de noche Dubai.",
  20: "Sofá capitoné tipo chesterfield (con botones en respaldo, brazos y frente); en individual (60 cm) y 2 puestos (150 cm).",
  21: "Su cabecero está dividido en paneles verticales acolchados que aportan ritmo, altura visual y un toque arquitectónico, con líneas limpias y geométricas que priorizan la pureza visual. Estilo: Lujo silencioso con minimalismo contemporáneo.",
  22: "Cabecero de bloques acolchados rectangulares en filas (según su foto en el catálogo).",
  23: "Cabecero con forma de arcoíris segmentado en paneles curvos: una forma orgánica con un toque lúdico y soñador, en línea con las tendencias que usan figuras de la naturaleza. Estilo: Temático y contemporáneo con estética de geometría suave.",
  24: "Toda la estructura tiene un aspecto redondeado y acolchado, diseñado para transmitir una sensación de suavidad y confort extremo. Estilo: Estética volumétrica con diseño orgánico y curvilíneo.",
  25: "Su pieza central es un cabecero de gran formato hecho de paneles cuadrados acolchados, que aporta confort, volumen y modernidad al espacio. Estilo: Minimalismo contemporáneo con estética de lujo silencioso.",
  26: "Su elemento más destacado es el cabecero, con un patrón de franjas verticales acolchadas que añade altura visual y un toque arquitectónico elegante. Estilo: Contemporáneo moderno con líneas depuradas.",
  27: "Sofá recto de brazos anchos; en individual, 2, 3 y 4 puestos.",
  28: "Su cabecero asimétrico y escalonado evoca la estética arquitectónica del art déco, con paneles verticales acolchados de distintas alturas que crean una forma muy original. Estilo: Art déco moderno con un enfoque minimalista y contemporáneo.",
  29: "Su sello es el cabecero con forma de concha marina o venera, una forma orgánica segmentada en paneles curvos que aporta un toque lúdico y soñador. Estilo: Temático y contemporáneo con estética soft modern.",
  30: "Su pieza principal es un cabecero que se extiende en vertical, con paneles acolchados en forma de canales que aportan ritmo visual, y que llega hasta los 2,40 m de altura. Estilo: Lujo silencioso y minimalismo contemporáneo. Su cabecero llega hasta 2,40 m de alto. No confundir con el sofá Londres.",
  31: "Cabecero alto de canales verticales acolchados (según su foto en el catálogo).",
  32: "Su cabecero circular imita un balón de fútbol y está hecho con una técnica de paneles segmentados y acolchados en blanco y negro. Estilo: Temático y contemporáneo con estética soft geometric.",
  33: "Copete alto de diseño envolvente, con laterales ligeramente curvados hacia delante y un acanalado vertical que aporta ritmo visual y una estética limpia. Estilo: Neoclásico moderno con diseño tipo wingback (orejero).",
  34: "Sofá de 3 puestos (220 cm) de piezas redondeadas y blandas. Puff a juego opcional (+REF 300).",
  35: "El cabecero extendido y la base tienen un patrón de costuras verticales que forma canales acolchados, aportando ritmo visual, orden y una sensación arquitectónica al conjunto. Estilo: Minimalismo contemporáneo con lujo silencioso.",
  36: "Su elemento principal es el cabecero acolchado dividido en tres secciones de formas redondeadas y asimétricas, que le da un carácter artístico y distintivo. Estilo: Minimalismo orgánico y lujo silencioso.",
  37: "Su diseño festoneado, con forma de concha, rompe con las estructuras tradicionales; esta tendencia curva suaviza los espacios y crea una sensación de fluidez y calidez. Estilo: Glamour contemporáneo fusionado con tendencia curva y orgánica.",
  38: "Inspirado en la silueta de Mickey Mouse, su cabecero está formado por tres piezas circulares tapizadas que usan la geometría circular para crear una pieza lúdica de ejecución limpia. Estilo: Diseño temático con estética modern fun.",
  39: "Su cabecero en forma de corona no es solo un contorno: es un elemento acolchado y voluminoso, con puntas redondeadas que añaden comodidad si se usa como respaldo. Estilo: Maximalismo infantil con enfoque en la fantasía.",
  40: "Su estructura tapizada de gran volumen y su cabecero con patrón festoneado, creado por paneles verticales, le dan un toque de opulencia reinterpretada. Estilo: Contemporáneo orgánico y curvo con glamour moderno. No confundir con la mesa de noche Paris.",
  41: "Sofá de formas curvas con canales verticales acolchados; en individual, 2 y 3 puestos.",
  42: "Sofá curvo de líneas orgánicas, 4 puestos (235 cm). El catálogo no ofrece puff para este modelo.",
  43: "Su cabecero se divide en dos grandes «cojines» acolchados que se curvan hacia delante en los extremos y crean una sensación de abrazo; las formas curvas son el pilar de su diseño. Estilo: Escandinavo moderno con un toque orgánico.",
  44: "Usa formas fluidas y asimétricas, sobre todo en su cabecero ondulado; la base tiene un volumen sólido y bajo, robusto pero ligero gracias a sus bordes redondeados. Estilo: Minimalismo orgánico y contemporáneo curvo.",
  45: "Destaca por sus líneas limpias y geométricas, enfocadas en la pureza visual moderna; lo más distintivo es que su cabecero llega hasta los 2,40 m de altura. Estilo: Lujo silencioso y minimalismo contemporáneo. Su cabecero llega hasta 2,40 m de alto.",
  46: "Sofá seccional con chaise y brazos acanalados; en individual, 2 y 3 puestos y modular en L o en U.",
  47: "Destaca por su imponente cabecero de bloques acolchados, que se integra en un ambiente de estilo industrial sofisticado. Estilo: Industrial-contemporáneo con estilo robusto adaptable.",
  48: "Su sello es el cabecero en semicírculo perfecto: una silueta curva que rompe con las líneas rectas tradicionales y aporta suavidad visual. Estilo: Minimalista curvo con forma orgánica.",
  49: "Sofá seccional con chaise y asiento capitoné; en individual, 2 y 3 puestos y modular en L o en U.",
  50: "El protagonista es el acolchado de botones, que cubre el cabecero, los laterales y el pie de cama, y aporta profundidad, relieve y un aire de elegancia tradicional. Estilo: Lujo silencioso y minimalismo contemporáneo. No confundir con la cama Venecia (Clásica).",
  51: "Lo más distintivo es el patrón geométrico hexagonal de los mechones del cabecero: una variante única y moderna que aporta un aire de opulencia actual. Estilo: Contemporáneo de lujo y glamour moderno.",
  52: "Diseño de estilo almohadillado cuyos laterales se elevan ligeramente y terminan en formas cilíndricas o redondeadas que actúan como un marco protector o «nido». Estilo: Minimalismo contemporáneo con una fuerte tendencia a las formas orgánicas.",
  53: "Su cabecero de paneles verticales acolchados se extiende a lo ancho, más allá del ancho de la cama, y proyecta una elegancia sofisticada a través de la sobriedad. Estilo: Lujo silencioso y minimalismo contemporáneo. El cabecero es más ancho que la cama.",
  54: "Cabecero corrido o extendido que une ambas camas y funciona como panel de pared, compuesto por módulos verticales con terminaciones en arco. Estilo: Estética orgánica moderna con diseño unificado. Cabecero corrido que une dos camas: si el precio es por cama o por el conjunto, lo confirma una asesora.",
  56: "Sofá recto de 3 puestos (190 cm), con respaldo y brazos de canales verticales acolchados.",
  57: "Su cabecero está formado por paneles verticales segmentados con terminaciones redondeadas de alturas variables, una silueta irregular y ondulada que crea un efecto visual orgánico. Estilo: Contemporáneo y orgánico, con silueta dinámica.",
  58: "Sofá recto clásico con varios cojines; en individual (70 cm) y 3 puestos (200 cm). No confundir con la cama London.",
  60: "Sofá capitoné en cuadros (asiento y respaldo); en individual (70 cm) y 2 puestos (150 cm).",
  61: "Sofá recto de líneas clásicas con brazos anchos; en individual, 2, 3 y 4 puestos.",
  62: "Mesa de noche de 60 x 45 x 45 cm. Colores: taupe, marrón, negro, beige y gris. No confundir con el sofá Amsterdam.",
  63: "Mesa de noche baja tipo bloque (el catálogo no da sus medidas). Colores: taupe, marrón, negro, beige y gris.",
  64: "Mesa de noche de dos cajones, 46 x 50 x 40 cm. Colores: taupe, marrón, negro, beige y gris.",
  66: "Mesa de noche baja y ancha de dos niveles, 54 x 80 x 37 cm. Colores: taupe, marrón, negro, beige y gris. No confundir con el sofá Dubai.",
  67: "Mesa de noche con nicho abierto y un cajón, 60 x 45 x 50 cm. Colores: taupe, marrón, negro, beige y gris.",
  68: "Peinadora de 90 cm de ancho, 40 cm de profundidad y 1,40 m de alto. Colores: blanco, marrón, negro y beige.",
  69: "Mesa de noche (el catálogo no da sus medidas). Colores: taupe, marrón, negro, beige y gris.",
  70: "Mesa de noche baja de dos cajones, 46 x 50 x 40 cm. Colores: taupe, marrón, negro, beige y gris. No confundir con la cama Paris.",
  71: "Su base robusta y su cabecero dividido en dos secciones verticales aportan una sensación de confort y modernidad. Estilo: Minimalismo contemporáneo con estética de lujo silencioso.",
  72: "Se aleja de los diseños temáticos tradicionales con una pieza estética que no sobreestimula visualmente el espacio de descanso, y combina la seguridad de una cuna con una cama adulta. Estilo: Mobiliario infantil evolutivo o de transición con minimalismo funcional. Solo en Individual y Matrimonial.",
  73: "Diseño segmentado y extendido que sobrepasa el ancho del colchón para enmarcar también las mesas de noche. El box de esta cama es liso. Estilo: Lujo silencioso y minimalismo contemporáneo.",
  74: "Cabecero rectangular capitoné, con botones (según su foto en el catálogo). Estilo: Clásico-moderno: elegancia tradicional con líneas minimalistas. No confundir con Venecia Era (Alta Gama).",
  76: "Sofá modular bajo en L (240 cm), de cojines acolchados segmentados.",
  100: "Asiento redondo bajo de 1 puesto (80 cm), con un cojín cilíndrico como respaldo.",
  101: "Puff cúbico de 40 cm de alto por 30 cm de ancho. Colores: blanco, gris claro, negro, beige y gris.",
  102: "Puff cilíndrico de 40 cm de alto por 30 cm de ancho. Colores: blanco, gris claro, negro, beige y gris.",
  103: "Puff redondo de 40 cm de alto por 60 cm de ancho. Colores: blanco, gris claro, negro, beige y gris.",
};

/** Reglas generales de cada línea, de los catálogos 2026 (sin añadir nada que no digan). */
export const especificaciones = [
  'Todas las camas: copete (cabecero) + box (base), garantía estructural de Dekog, y el textil y el color de tu preferencia. Medidas: Individual 1,00 x 1,90 m · Matrimonial 1,40 x 1,90 m · Queen 1,60 x 1,90 m · King 2,00 x 2,00 m (Sky, solo Individual y Matrimonial). El precio del catálogo y de la web es solo la cama (copete y box): el colchón NO va incluido; tiene su propio precio según la medida y el modelo, y lo da una asesora (lo dijo la dueña el 8-oct).',
  'El box (la base de la cama) cambia la ESTÉTICA, no la altura: con cualquier box la cama queda igual de alta. Los centímetros de cada box son el ancho de su franja lateral; el alta gama y el nube la tienen más ancha, así que la cama se ve más robusta y da una sensación de más confort (lo explicó la dueña el 8-oct). Cuál va incluido depende de la línea: el liso en Clásicas y Kids; en Alta Gama cada modelo trae SU box incluido (alta gama, curvo o nube, según el modelo) y nunca se paga adicional.',
  'Camas Clásicas («diseños atemporales que equilibran elegancia, confort y calidez»): box clásico liso (franja lateral de 5 a 7 cm) incluido · box alta gama (franja de 7 a 10 cm) +REF 80 · box nube (franja de 10 a 15 cm) +REF 150. Altura del copete: 1,20 a 1,30 m.',
  'Camas Alta Gama («diseñadas para transformar el descanso en una experiencia sofisticada»; líneas imponentes, materiales premium, diseño contemporáneo): cada modelo trae SU box incluido en el precio y no se paga nada adicional (lo dijo la dueña el 8-oct): según el modelo, box alta gama liso (franja lateral de 7 a 10 cm), box curvo o box nube (franja de 10 a 15 cm). Traen el box curvo Sydney, Berna y Singapure. Qué box trae cada uno de los demás modelos lo confirma una asesora.',
  'Camas Kids (diseños divertidos): box clásico liso (franja lateral de 6 a 7 cm) incluido · box alta gama (franja de 8 a 10 cm) +REF 80 · box nube (franja de 10 a 15 cm) +REF 120.',
  'Sofás y piezas de 1 puesto (COD-2000 a COD-2003): estructura de madera de pino secada al horno, relleno de espuma de alta densidad, base reforzada con soporte central, patas ocultas y tapizado a elección del catálogo de textiles.',
  'Puffs COD-2004, COD-2005 y COD-2006: estructura de madera de pino secada al horno y acabados de alta calidad; colores blanco, gris claro, negro, beige y gris.',
  'Mesas de noche y peinadora: estructura de madera de pino secada al horno, correderas telescópicas de alta resistencia, acabados de alta calidad y el color y acabado de tu preferencia (mesas: taupe, marrón, negro, beige y gris; peinadora: blanco, marrón, negro y beige).',
  'Puff a juego opcional solo en los sofás Amsterdam (+REF 200), Mississippi (+REF 300) y Dubai (+REF 130).',
  'Nombres repetidos: Amsterdam y Dubai son sofás y también mesas de noche; Paris es cama y mesa de noche; London es cama y Londres es sofá; Venecia (Clásica) y Venecia Era (Alta Gama) son camas distintas. Si hay duda, pregunta a cuál se refiere.',
  'Lema: «Dekog Home · Elevamos tu descanso con mobiliario arquitectónico».',
];

/** Cómo se compra, según las respuestas de la dueña del 2026-10-08 (sin añadir nada que no dijo). */
export const politicas = [
  'Formas de pago: Pago Móvil, transferencia, Zelle, Zinli, Banesco Panamá, Binance, efectivo en dólares o divisas, tarjetas Visa y Mastercard, y Cashea. Los datos para pagar los da una asesora.',
  'El precio en REF es el mismo con cualquier forma de pago, salvo Cashea: la app de Cashea solo trabaja con la tasa BCV del dólar, así que el monto se ajusta de la tasa BCV del euro a la del dólar. Con Cashea, la inicial y las cuotas dependen del nivel de cada usuario y las indica la propia app.',
  'Anticipo: con el 50 % se empieza a fabricar el pedido; si el modelo está en stock, con el 50 % se aparta.',
  'Descuentos y promociones: por ahora no hay ninguna vigente. Cuando las haya, se anuncian por las redes sociales de Dekog (Instagram @dekog.home).',
  'Fabricación de camas, sofás y mesas: unos 15 días hábiles; una mesa de noche personalizada, unos 20 días hábiles. Si es urgente, una asesora consulta la disponibilidad: se puede llegar a entregar en 3 días.',
  'Envíos a todo el país; el costo depende de la ubicación y el día de entrega se coordina según la disponibilidad del equipo de despacho y del cliente. En Valencia la entrega o la instalación tampoco van incluidas: son un servicio aparte cuyo costo depende de la dirección y de si es casa o edificio. El monto exacto lo da una asesora.',
  'Garantía estructural: Camas Clásicas 12 meses; Camas Alta Gama y Camas Kids 18 meses; muebles (sofás, puffs, mesas y peinadora) 6 meses.',
];
