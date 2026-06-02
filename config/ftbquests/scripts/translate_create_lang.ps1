# Traduce entradas Create (AoC) en es_es.snbt
$packRoot = 'c:\Users\hecto\curseforge\minecraft\Instances\Arkcraft'
$langPath = Join-Path $packRoot 'config\ftbquests\quests\lang\es_es.snbt'
$utf8 = New-Object System.Text.UTF8Encoding $false

$tr = @{
    'chapter.27900E4479E6E12D.title' = 'Create'
    'quest.00DFC7824C3750FB.quest_subtitle' = 'Colocado delante del ventilador encapsulado, permite embrujar objetos.\n\nDestaca: convierte arena en arena de almas.'
    'quest.0138F3EB263D1721.quest_subtitle' = 'Bloque que gestiona el montaje y desmontaje de trenes.'
    'quest.021E30871E97C634.quest_subtitle' = 'Maquina avanzada de distribucion de objetos: hay que apuntarla a puntos que el brazo alcance; si no llega, no funciona. Tambien consume SU para moverse.'
    'quest.0306E0A1DA82A811.quest_subtitle' = 'Componente de redstone que emite senal al contactar con otro contacto de redstone. Muy util en contraptions.'
    'quest.03FAA1891E7D56FD.quest_subtitle' = 'Conducto mas configurable.'
    'quest.05BFBACBB2337231.quest_subtitle' = 'La andesita es una piedra muy abundante en bolsas grandes bajo tierra; se camufla con la piedra, asi que abre bien los ojos. Necesitaras mucha si quieres maquinaria aqui, asi que excava todo lo que puedas. Nota mental: el mineral de zinc tambien importa; mezclado con andesita forma la aleacion clave de la maquinaria.'
    'quest.05BFBACBB2337231.title' = 'Andesita, la base'
    'quest.063D47D4F61457BC.quest_subtitle' = 'Permite programar trenes para que mobs o quemadores blaze los conduzcan.'
    'quest.06653E21053ACDF6.quest_subtitle' = 'Componente de redstone que se activa al recibir senal por un lado y se desactiva al recibirla por el otro.'
    'quest.07680D1563629D55.quest_subtitle' = 'En realidad es una cinta que no se mueve.'
    'quest.0945E885A92D06B7.quest_subtitle' = 'La forma mas simple de generar energia cinetica: tu mismo como motor. !A darle a la manivela!'
    'quest.0945E885A92D06B7.title' = [string][char]0x00A1 + 'Giralo a tope!'
    'quest.0A2167437E1C4F13.quest_subtitle' = 'Repetidor que envia un pulso tras un tiempo configurable.'
    'quest.0A2167437E1C4F13.title' = [string][char]0x00BF + 'Siento un pulso?'
    'quest.0A6F439E158D1525.quest_subtitle' = 'Filtro por atributos como "se puede fundir" o "de Create".'
    'quest.0B5FF13E714BF391.quest_subtitle' = 'Muestra la velocidad de rotacion de una red cinetica.'
    'quest.0C8D19B106618A91.quest_subtitle' = 'La caja de engranajes es como una prolongacion para ejes: cambia su direccion y permite varios ejes en distintas caras. Tambien existe version vertical.'
    'quest.0E491A562DF88795.quest_subtitle' = 'Los eyectores ponderados lanzan objetos con precision a larga distancia.'
    'quest.0FB4FFD361C5DF69.quest_subtitle' = 'Solo es un asiento, nada mas. En una contraption en movimiento, pegalo con cola para ir sentado; no te superpegues tu mismo.'
    'quest.0FB4FFD361C5DF69.title' = 'Silla.'
    'quest.10331210B10CF626.quest_subtitle' = 'Usa SU para romper bloques; en contraptions sirve para tuneladoras y similares.'
    'quest.12913E20A87ABA1F.quest_subtitle' = 'Permite contraptions que suben y bajan.'
    'quest.12C789BF2D021A55.quest_subtitle' = 'Colocado delante del ventilador encapsulado, permite ahumar objetos.'
    'quest.13D4FF6929AE8D8F.quest_subtitle' = 'Objeto que aumenta tu alcance.'
    'quest.152333F57A5C1913.quest_subtitle' = 'Convierte placas en varillas y varillas en cables.'
    'quest.155F388D56FB4A5F.quest_subtitle' = 'Bloques que talar arboles o permiten talarlos desde contraptions. Tambien recetas como cortar bloques o descortezar troncos.'
    'quest.155F388D56FB4A5F.title' = 'Motosierra no portatil'
    'quest.155FBDDA1C6194CA.quest_subtitle' = 'Apaga partes de una contraption mientras esta formada.'
    'quest.16CD1CC9F70A91AF.quest_subtitle' = 'Al recibir redstone, divide o duplica la velocidad de rotacion de las cadenas conectadas.'
    'quest.17541CB8E37D10F1.quest_subtitle' = 'Genera energia (E) a partir de energia cinetica; la cantidad depende del RPM y el tope es 256 E/t.'
    'quest.19166D31F298D0D5.quest_subtitle' = 'Cartel avanzado que se actualiza mas rapido con mayor RPM. Como los paneles de estacion.'
    'quest.19183F380B49F31C.quest_subtitle' = 'Maquina muy versatil: empuja y atrae entidades y lava, embruja, funde y ahuma objetos. No es para uso domestico.'
    'quest.1A541F8D6FF3C21B.quest_subtitle' = 'Colocado delante del ventilador encapsulado, permite lavar objetos.\n\nDestaca: convierte arena de almas en cuarzo del Nether.'
    'quest.1ABC2ADBFEF3144D.quest_subtitle' = 'Los conectores insertan o extraen energia de bloques; los cables unen conectores.'
    'quest.1CE6DB5F873483AF.quest_subtitle' = 'Los conductos mueven objetos entre inventarios en vertical.'
    'quest.219E307B851DB05A.quest_subtitle' = 'Invierte el sentido de rotacion al aplicar redstone.'
    'quest.21DD4EFBB31B669D.quest_subtitle' = 'Version mejorada del tanque de cobre trasero. ?Tanta proteccion si no cubre el frente?'
    'quest.2246A107ECC3CBC5.quest_subtitle' = '!Contraption divertida! Construye estructuras automaticamente si tienes el esquema en papel, polvora y un almacen con materiales. Usa un portapapeles: anota lo que falta.'
    'quest.227597F357AA480D.quest_subtitle' = 'Permite extraer liquidos de objetos.'
    'quest.293196C72E44A5AC.quest_subtitle' = 'Limpia y pavimenta mientras viajas en tren.'
    'quest.29649C654117D56A.quest_subtitle' = 'Palanca que puede emitir cualquier nivel de redstone. Una palanca mejorada.'
    'quest.29649C654117D56A.title' = '!Palanca nivel pro!'
    'quest.29EFF7AED691682B.quest_subtitle' = 'Rompe al instante casi todos los bloques de Create con Mayus + clic derecho. Clic derecho para rotarlos.'
    'quest.29EFF7AED691682B.title' = 'No es una llave inglesa'
    'quest.2A0F7A2AA1C0E9C1.quest_subtitle' = 'Filtro basico.'
    'quest.2AB0806AA6A7076C.quest_subtitle' = 'Version mejorada del casco de buceo de cobre. De lejos parece casco militar.'
    'quest.2BC564546A48616B.quest_subtitle' = 'Contraptions que giran alrededor de un punto; muy util en granjas.'
    'quest.2C3CD6663D38750A.quest_subtitle' = 'Como una prensa hidraulica real. No metas la mano debajo.'
    'quest.2C8EF8E65133D178.quest_subtitle' = 'Para obtener laton hay que calentar un mezclador mecanico que mezcle cobre y zinc.\n\nEl quemador blaze vacio se llena con clic derecho sobre un spawner o un blaze.'
    'quest.2C8EF8E65133D178.title' = 'Quemador blaze'
    'quest.2CC43C68A8EECB8D.quest_subtitle' = 'La fuente cinetica mas densa, pero la mas compleja: agua y calor constantes. No es Thomas el tren.'
    'quest.2CC43C68A8EECB8D.title' = '!A todo vapor!'
    'quest.2D0B2D01669E88DD.quest_subtitle' = 'Simplemente un canon de patatas.'
    'quest.2E10D93D926631F6.quest_subtitle' = 'Objeto para craftear piezas mecanicas mas avanzadas.'
    'quest.312320F8FF1FDF24.quest_subtitle' = 'Version mejorada de las botas de buceo de cobre.'
    'quest.3163768E54FA4D87.quest_subtitle' = '?Sabes lo que es un molino de viento? Gira con el viento y genera SU.'
    'quest.3163768E54FA4D87.title' = 'Que no te lleve el viento'
    'quest.3736B545828490F1.quest_subtitle' = 'Algunos fluidos se extraen infinitamente si la poza tiene 10000 bloques fuente o mas.\n\nBusca en REI los validos con "$create:bottomless".'
    'quest.385C156051820A7B.quest_subtitle' = 'Almacena aire comprimido para el casco de buceo: el oxigeno bajo el agua.'
    'quest.3887DB2CA518BC26.quest_subtitle' = 'Bloque util para montar contraptions.'
    'quest.39CF18F0C2B06818.quest_subtitle' = 'Estructura multibloque para guardar mucha energia.'
    'quest.39E865F0D72CF9B8.quest_subtitle' = 'El eje es pieza basica para transmitir rotacion. Puedes alargarlo para mover varios mecanismos.'
    'quest.39E865F0D72CF9B8.title' = 'Varilla de rotacion constante'
    'quest.3B10D31EFD80798C.quest_subtitle' = 'Permite crear un reloj funcional a medida.'
    'quest.3B925864D243F779.quest_subtitle' = 'Bloques para que contraptions cosechen cultivos.'
    'quest.3C67BDE80F43FF9E.quest_subtitle' = 'Carga ciertos objetos.'
    'quest.3D11842DDDE1D396.quest_subtitle' = 'Terminologia:\n\nUnidades de estres (SU): cuanto estres genera o consume algo.\n\n'
    'quest.3D11842DDDE1D396.title' = '!Estoy estresado! Hay que medirlo'
    'quest.3DE38636656DD1F6.quest_subtitle' = 'Exagero un poco, pero la redstone es vital en Create: estos bloques compactan contraptions pero las complican. A estudiar.'
    'quest.3DE38636656DD1F6.title' = 'Redstone + Create = complicado'
    'quest.3EADB5F22FAD4A56.quest_subtitle' = 'Mejora del tunel de andesita con mas opciones para los objetos.'
    'quest.3F8B59B04E26C1C2.quest_subtitle' = 'Componente de redstone: solo deja pasar energia (E) mientras recibe senal.'
    'quest.4007D36163F8555E.quest_subtitle' = 'Moliendolo todo a polvo.'
    'quest.408D9361AF8AA499.quest_subtitle' = 'Maquina simple con mucho potencial: coloca bloques y usa objetos sobre bloques o entidades.'
    'quest.410BEC9893112A43.quest_subtitle' = 'Las ruedas dentadas suben la velocidad de rotacion o extienden contraptions segun orientacion y tamano. Experimenta.'
    'quest.410BEC9893112A43.title' = '?Son engranajes con otro nombre?'
    'quest.4206216A5F414642.quest_subtitle' = 'Las cintas mueven objetos en linea recta o en diagonal. Un eje en cada extremo para que funcione.'
    'quest.4206216A5F414642.title' = 'No te la pongas; no es ropa'
    'quest.4267B97B18413E1D.quest_subtitle' = 'Como en Create casi no se meten o sacan liquidos a mano, estas tuberias ayudan mucho.\n\nTambien permiten agua infinita si extraes de un bloque fuente con dos fuentes adyacentes.'
    'quest.4377B43142216C8D.quest_subtitle' = 'Casco que usa aire de un tanque equipado para respirar bajo el agua. No bajo lava.'
    'quest.44AE17D3427B487C.quest_subtitle' = '"Polea con cuerda mas fancy"\n\nPermite montar ascensores.'
    'quest.44C3B2628015505C.quest_subtitle' = 'Mueve estructuras en linea recta con fuerza rotacional.'
    'quest.44C3B2628015505C.title' = 'Piston mecanico'
    'quest.44E0DDEE0578557F.quest_subtitle' = 'Almacen multibloque de objetos sin acceso manual. Ni una puerta lo abre.'
    'quest.48E5D56C47DF6642.quest_subtitle' = 'Por donde circula el tren.'
    'quest.48E5D56C47DF6642.title' = 'Vias de tren'
    'quest.49EE6F88CD93352E.quest_subtitle' = 'Colocado delante del ventilador encapsulado, permite fundir objetos con aire caliente.'
    'quest.4E0503134BFF19F0.quest_subtitle' = 'Monitoriza el nivel de llenado de inventarios y tanques.'
    'quest.4E834477717F726A.quest_subtitle' = 'Te permite controlar el tren.'
    'quest.4F61B1F3D1E2C6E2.quest_subtitle' = 'Bloque principal para almacenar fluidos a gran escala.'
    'quest.50C0D23949DD8BE6.quest_subtitle' = 'Corta la fuerza rotacional al recibir redstone.'
    'quest.52C1D5727A82A72F.quest_subtitle' = 'Los tuneles gestionan el flujo de objetos en cintas.'
    'quest.541988089F760BD6.quest_subtitle' = 'Componente de redstone que cambia de estado con cada pulso.'
    'quest.5611FCC58301372A.quest_subtitle' = 'Ejecuta una secuencia de rotaciones al recibir redstone.'
    'quest.5C06543962E420C4.quest_subtitle' = 'Motor que convierte energia (E) en energia cinetica (SU) a cualquier RPM.'
    'quest.5CDDAD4D40B67D7B.quest_subtitle' = 'Componente de redstone que alarga un pulso de forma configurable.'
    'quest.5D0986618729A519.quest_subtitle' = 'Bloque que busca objetos concretos en el mundo o en inventarios.'
    'quest.5D0986618729A519.title' = 'Te estoy vigilando.'
    'quest.5E04B024C8E9B865.quest_subtitle' = 'Llena objetos con fluidos y craftea recetas que usan fluidos.'
    'quest.5FF617620A38A716.quest_subtitle' = 'Pega bloques entre si; muy util en contraptions. Menos mal que no tenemos dedos...'
    'quest.60D073A200595414.quest_subtitle' = 'Muestra el estres actual y la capacidad de una red cinetica, no el estres ajeno.'
    'quest.617D59D4F14FA3AE.quest_subtitle' = 'Contraptions que recorren vias como vagonetas.'
    'quest.618FF4D4A0FCC14C.quest_subtitle' = 'Coloca un espejo que ayuda a construir con simetria.'
    'quest.642172D58E8B11E1.quest_subtitle' = 'Fuente cinetica con agua en movimiento: mismo SU y RPM mientras haya un bloque de agua corriente adyacente.\n\nClic derecho con casi cualquier tabla de madera para cambiar el aspecto.'
    'quest.65A2AC554D856D93.quest_subtitle' = 'Contraptions que se mueven por porticos.'
    'quest.666E9828756ADB0C.quest_subtitle' = 'Base de casi todo lo relacionado con fluidos en Create.\n\nTambien encapsula tuberias.'
    'quest.672C61B048CB3B85.quest_subtitle' = 'Para un tren necesitas al menos:\n- 1 carcasa de tren\n- 1 estacion de tren\n- Vias suficientes\n\nPara montarlo, haz Ponder en la estacion de tren.'
    'quest.67B3D0A82F1BB3EA.quest_subtitle' = 'Base de bloques mas avanzados.'
    'quest.67CE399D0A9C0F57.quest_subtitle' = 'Crafteo automatico de recetas normales y de recetas mas grandes que la mesa de crafteo.'
    'quest.68CC0DF64AD608C1.quest_subtitle' = 'Genera el doble de SU que la rueda hidraulica normal, pero a menor RPM. Ocupa mas espacio.'
    'quest.6AFD022E4050ECB5.quest_subtitle' = 'Muestra informacion en tiempo real en un panel o tubo nixie. No compartas datos personales.'
    'quest.6C26214738805896.quest_subtitle' = 'Imprescindible con Create: mas info de bloques, como impacto de estres.'
    'quest.6CE47960B6FEF89D.quest_subtitle' = 'Coloca o extrae grandes volumenes de liquido.'
    'quest.6F4B091DDC613408.quest_subtitle' = 'Contraptions que labran tierra o lanzan entidades.'
    'quest.7088750D467E771E.quest_subtitle' = 'Ajuste fino del RPM: mas rapido o mas lento.'
    'quest.712A93B1E8B43823.quest_subtitle' = 'Con redstone, empaqueta objetos del inventario conectado en un paquete.'
    'quest.72F3965D09F3B6F0.quest_subtitle' = '?Quieres meter liquidos en los quemadores blaze por tuberia? Dale una pajita y sorberan del tubo.\n\nPulsa U sobre la pajita para ver liquidos y tiempos de combustion.'
    'quest.73A2838E56534342.quest_subtitle' = 'Contraptions que transfieren fluidos a bloques.'
    'quest.7452A3A5599B09AB.quest_subtitle' = 'Entrada y salida de inventarios de un objeto a la vez.\n\nEl Ponder no lo dice: puede soltar objetos al suelo y solo mantiene uno cerca del bloque donde caen.'
    'quest.74ADDF7066B30B3F.quest_subtitle' = 'Varias salidas rotacionales en paralelo.'
    'quest.757B12A4C7F7D355.quest_subtitle' = 'Embudo avanzado con filtro y pilas mas grandes.'
    'quest.776F0CA023690BC6.quest_subtitle' = 'Muestra texto o numeros; util tambien en ascensores.'
    'quest.798CADF6B8930572.quest_subtitle' = 'Autocraftea recetas sin forma y mezcla cosas como pociones.\n\nNecesita al menos 30 RPM.'
    'quest.7B3913CCEBC7717D.quest_subtitle' = 'Emite redstone al detectar un tren.'
    'quest.7B9D2F7F33818837.quest_subtitle' = 'Mejora de la muela; tiene recetas distintas, conviene conservar ambas.'
    'quest.7C5CDB413D2EBD0C.quest_subtitle' = 'Bloques imitadores para escalones y paneles con materiales que no los admiten.'
    'quest.7C5CDB413D2EBD0C.title' = 'Imitador'
    'quest.7E8E6019017D76EC.quest_subtitle' = 'Se pega a bloques al recibir redstone.'
    'quest.7EA4E2D90A0FBC21.quest_subtitle' = 'Caminas bajo el agua como en tierra y sobre cintas sin que te arrastren; resbaladizo, vaya.'
    'quest.7F4D5B0A7A3CA576.quest_subtitle' = 'Controla el flujo de trenes en vias e intersecciones.'
    'quest.7F5E2D38C40E93F7.quest_subtitle' = 'Transmite redstone sin cables dentro de un radio. No es Wi-Fi.'
    'quest.7F5E2D38C40E93F7.title' = '?Wi-Fi? No.'
}

function Escape-Snbt([string]$s) {
    $sb = New-Object System.Text.StringBuilder
    for ($i = 0; $i -lt $s.Length; $i++) {
        $c = $s[$i]
        if ($c -eq '\') {
            if ($i + 1 -lt $s.Length -and $s[$i + 1] -eq 'n') {
                [void]$sb.Append('\\n')
                $i++
            }
            else { [void]$sb.Append('\\') }
        }
        elseif ($c -eq '"') { [void]$sb.Append('\"') }
        else { [void]$sb.Append($c) }
    }
    return $sb.ToString()
}

$lang = [System.IO.File]::ReadAllText($langPath, [System.Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
$lines = $lang -split "`r?`n"
$out = New-Object System.Collections.Generic.List[string]
$chapterStart = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '^\tchapter\.27900E4479E6E12D\.') { $chapterStart = $i; break }
}
if ($chapterStart -lt 0) { Write-Error 'No se encontro bloque Create'; exit 1 }

# everything before Create block
for ($i = 0; $i -lt $chapterStart; $i++) { [void]$out.Add($lines[$i]) }

# translated Create entries sorted by key
$keys = $tr.Keys | Sort-Object
foreach ($key in $keys) {
    $val = Escape-Snbt $tr[$key]
    [void]$out.Add("`t$key`: `"$val`"")
}

# closing brace (skip old Create lines until })
for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    if ($lines[$i] -match '^\}$') { [void]$out.Add($lines[$i]); break }
}

$newLang = $out -join [Environment]::NewLine
[System.IO.File]::WriteAllText($langPath, $newLang, $utf8)
Write-Host "Traducidas $($tr.Count) claves Create" -ForegroundColor Green
& (Join-Path $PSScriptRoot 'accent_create_es.ps1')
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host 'Listo. /ftbquests reload' -ForegroundColor Cyan
