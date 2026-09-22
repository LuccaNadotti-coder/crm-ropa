-- =========================================================
-- FICHAS CARGADAS CON EL APELLIDO ADELANTE
--
-- El CRM saluda con la primera palabra del nombre, asi que a estas 55
-- fichas les escribe "Hola Ayala" o "Hola Gonzales" en vez del nombre. Llenar
-- nombre_pila lo arregla: ese campo manda sobre el saludo del WhatsApp y sobre
-- la tarjeta de cumpleanos.
--
-- COMO SE ARMO LA LISTA
--
-- Sin ninguna lista de nombres peruanos: se aprendio de las otras fichas de la
-- base. Una palabra que aparece seguido AL FINAL de otros nombres es un
-- apellido; una que aparece seguido AL PRINCIPIO es un nombre. La firma de una
-- ficha al reves es un nombre de pila en la tercera palabra o mas.
--
-- REVISAR ANTES DE CORRER. Es una deduccion, no un dato, y se equivoca en
-- algunos casos: alguien con tres nombres, o apellidos que tambien son nombres
-- (ROSALES, FLORES, LEON). Arriba de cada linea esta la ficha completa y lo
-- que dice hoy. Si el nombre propuesto no es el correcto, corregi la palabra;
-- si la ficha estaba bien, borra la linea.
--
-- Cada linea es independiente: se puede correr por partes.
-- =========================================================

-- ALAMA CARREÑO ELIZABETH KARINA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Alama"
update clientes set nombre_pila = 'Elizabeth' where nombre = 'ALAMA CARREÑO ELIZABETH KARINA';

-- ALZAMORA ORTIZ VICTORIA ELENA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Alzamora"
update clientes set nombre_pila = 'Victoria' where nombre = 'ALZAMORA ORTIZ VICTORIA ELENA';

-- AMAYO VARGAS DE SILVA ROSA OTILIA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Amayo"
update clientes set nombre_pila = 'Rosa' where nombre = 'AMAYO VARGAS DE SILVA ROSA OTILIA';

-- ANGELES MELGAREJO DORIS MADELEINE   ·   Los Olivos SFIDA
--    hoy le dice "Hola Angeles"
update clientes set nombre_pila = 'Doris' where nombre = 'ANGELES MELGAREJO DORIS MADELEINE';

-- AQUIJE SOTOMAYOR MARIA ENRIQUETA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Aquije"
update clientes set nombre_pila = 'Maria' where nombre = 'AQUIJE SOTOMAYOR MARIA ENRIQUETA';

-- ARROYO ZORRILLA TANIA KELIN   ·   Los Olivos SFIDA
--    hoy le dice "Hola Arroyo"
update clientes set nombre_pila = 'Tania' where nombre = 'ARROYO ZORRILLA TANIA KELIN';

-- ASMAT CORONADO LISSET   ·   Los Olivos SFIDA
--    hoy le dice "Hola Asmat"
update clientes set nombre_pila = 'Lisset' where nombre = 'ASMAT CORONADO LISSET';

-- AYALA MENDOZA CYNTHIA VANESSA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Ayala"
update clientes set nombre_pila = 'Cynthia' where nombre = 'AYALA MENDOZA CYNTHIA VANESSA';

-- BARRIENTOS HUAMAN ANA PATRICIA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Barrientos"
update clientes set nombre_pila = 'Ana' where nombre = 'BARRIENTOS HUAMAN ANA PATRICIA';

-- BENDEZU PEREZ SILVANA LORENA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Bendezu"
update clientes set nombre_pila = 'Silvana' where nombre = 'BENDEZU PEREZ SILVANA LORENA';

-- BORHORQUEZ DE CARRANZA JULIA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Borhorquez"
update clientes set nombre_pila = 'Julia' where nombre = 'BORHORQUEZ DE CARRANZA JULIA';

-- CARLOS CARLOS KARINA PAOLA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Carlos"
update clientes set nombre_pila = 'Karina' where nombre = 'CARLOS CARLOS KARINA PAOLA';

-- CHUMBES CHIROQUE ELVIRA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Chumbes"
update clientes set nombre_pila = 'Elvira' where nombre = 'CHUMBES CHIROQUE ELVIRA';

-- DE LA CRUZ LLANCARI SUSSY MARIA   ·   Los Olivos SFIDA
--    hoy le dice "Hola De"
update clientes set nombre_pila = 'Sussy' where nombre = 'DE LA CRUZ LLANCARI SUSSY MARIA';

-- DIAZ TORRES DORIS JONHNI   ·   Los Olivos SFIDA
--    hoy le dice "Hola Diaz"
update clientes set nombre_pila = 'Doris' where nombre = 'DIAZ TORRES DORIS JONHNI';

-- DOMICIANA GARRO ALVA   ·   Chimu SFIDA
--    hoy le dice "Hola Domiciana"
update clientes set nombre_pila = 'Alva' where nombre = 'DOMICIANA GARRO ALVA';

-- ENCISO CACERES ALEJANDRA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Enciso"
update clientes set nombre_pila = 'Alejandra' where nombre = 'ENCISO CACERES ALEJANDRA';

-- FLORES CUNYA ANA LUCRECIA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Flores"
update clientes set nombre_pila = 'Ana' where nombre = 'FLORES CUNYA ANA LUCRECIA';

-- GALLARDO ARANDA SUSANA PILAR   ·   Los Olivos SFIDA
--    hoy le dice "Hola Gallardo"
update clientes set nombre_pila = 'Susana' where nombre = 'GALLARDO ARANDA SUSANA PILAR';

-- GAMARRA AVENDAÑO SANDRA MARIELLA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Gamarra"
update clientes set nombre_pila = 'Sandra' where nombre = 'GAMARRA AVENDAÑO SANDRA MARIELLA';

-- GASTON AQUINO YVONNE PATRICIA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Gaston"
update clientes set nombre_pila = 'Yvonne' where nombre = 'GASTON AQUINO YVONNE PATRICIA';

-- GONZALES TEMOCHE ISABEL   ·   Los Olivos SFIDA
--    hoy le dice "Hola Gonzales"
update clientes set nombre_pila = 'Isabel' where nombre = 'GONZALES TEMOCHE ISABEL';

-- GUARDAMINO GALINDO LIDIA TERESA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Guardamino"
update clientes set nombre_pila = 'Lidia' where nombre = 'GUARDAMINO GALINDO LIDIA TERESA';

-- GUTIERREZ ACUÑA DIANA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Gutierrez"
update clientes set nombre_pila = 'Diana' where nombre = 'GUTIERREZ ACUÑA DIANA';

-- HARO AMES DIGNA EDITH   ·   Los Olivos SFIDA
--    hoy le dice "Hola Haro"
update clientes set nombre_pila = 'Digna' where nombre = 'HARO AMES DIGNA EDITH';

-- HUAMANI GELDRES GLADYS AVELINA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Huamani"
update clientes set nombre_pila = 'Gladys' where nombre = 'HUAMANI GELDRES GLADYS AVELINA';

-- LEON CHILON KATHERINE ELIZABETH   ·   Los Olivos SFIDA
--    hoy le dice "Hola Leon"
update clientes set nombre_pila = 'Katherine' where nombre = 'LEON CHILON KATHERINE ELIZABETH';

-- LEYVA LEON KARIN JANETH   ·   Los Olivos SFIDA
--    hoy le dice "Hola Leyva"
update clientes set nombre_pila = 'Karin' where nombre = 'LEYVA LEON KARIN JANETH';

-- LLACCTAS MIRANDA SONIA EUGENIA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Llacctas"
update clientes set nombre_pila = 'Sonia' where nombre = 'LLACCTAS MIRANDA SONIA EUGENIA';

-- MALCA ROMERO LUZ AURORA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Malca"
update clientes set nombre_pila = 'Luz' where nombre = 'MALCA ROMERO LUZ AURORA';

-- MELGAREJO GOMEZ PAMELA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Melgarejo"
update clientes set nombre_pila = 'Pamela' where nombre = 'MELGAREJO GOMEZ PAMELA';

-- MIYOSHI ARIAS CECILIA SOLEDAD   ·   Los Olivos SFIDA
--    hoy le dice "Hola Miyoshi"
update clientes set nombre_pila = 'Cecilia' where nombre = 'MIYOSHI ARIAS CECILIA SOLEDAD';

-- MORALES SIMPALO JENY ELIZABETH   ·   Los Olivos SFIDA
--    hoy le dice "Hola Morales"
update clientes set nombre_pila = 'Elizabeth' where nombre = 'MORALES SIMPALO JENY ELIZABETH';

-- ORTEGA CADILLO NANCY CLAUDIA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Ortega"
update clientes set nombre_pila = 'Nancy' where nombre = 'ORTEGA CADILLO NANCY CLAUDIA';

-- PAIVA PACAYA ANA CLARICE   ·   Los Olivos SFIDA
--    hoy le dice "Hola Paiva"
update clientes set nombre_pila = 'Ana' where nombre = 'PAIVA PACAYA ANA CLARICE';

-- PAJUELO TORRES KAREN FIORELLA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Pajuelo"
update clientes set nombre_pila = 'Karen' where nombre = 'PAJUELO TORRES KAREN FIORELLA';

-- PERALTA FLORES BERNARDITA MERCEDES   ·   Los Olivos SFIDA
--    hoy le dice "Hola Peralta"
update clientes set nombre_pila = 'Bernardita' where nombre = 'PERALTA FLORES BERNARDITA MERCEDES';

-- PEREZ GURREONERO ANA SARA MERCEDES   ·   Los Olivos SFIDA
--    hoy le dice "Hola Perez"
update clientes set nombre_pila = 'Ana' where nombre = 'PEREZ GURREONERO ANA SARA MERCEDES';

-- PILCO VILLAR LOURDES ESTHER   ·   Los Olivos SFIDA
--    hoy le dice "Hola Pilco"
update clientes set nombre_pila = 'Lourdes' where nombre = 'PILCO VILLAR LOURDES ESTHER';

-- RIVAS LOPEZ NATHALY MERCEDES   ·   Los Olivos SFIDA
--    hoy le dice "Hola Rivas"
update clientes set nombre_pila = 'Nathaly' where nombre = 'RIVAS LOPEZ NATHALY MERCEDES';

-- RIVERO PAUCAR CARMEN GABRIELA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Rivero"
update clientes set nombre_pila = 'Carmen' where nombre = 'RIVERO PAUCAR CARMEN GABRIELA';

-- ROMERO TOLEDO DORA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Romero"
update clientes set nombre_pila = 'Dora' where nombre = 'ROMERO TOLEDO DORA';

-- ROSALES SICCHE JACKELINE ELIZABETH   ·   Los Olivos SFIDA
--    hoy le dice "Hola Rosales"
update clientes set nombre_pila = 'Jackeline' where nombre = 'ROSALES SICCHE JACKELINE ELIZABETH';

-- RUIZ ESPINO CRESTHEN ROXANA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Ruiz"
update clientes set nombre_pila = 'Cresthen' where nombre = 'RUIZ ESPINO CRESTHEN ROXANA';

-- SANCHEZ ACOSTUPA KARIM   ·   Los Olivos SFIDA
--    hoy le dice "Hola Sanchez"
update clientes set nombre_pila = 'Karim' where nombre = 'SANCHEZ ACOSTUPA KARIM';

-- SILVA BACA FATIMA ELIZABETH   ·   Los Olivos SFIDA
--    hoy le dice "Hola Silva"
update clientes set nombre_pila = 'Fatima' where nombre = 'SILVA BACA FATIMA ELIZABETH';

-- SORIA MILLA MILAGROS IMELDA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Soria"
update clientes set nombre_pila = 'Milagros' where nombre = 'SORIA MILLA MILAGROS IMELDA';

-- SURCO ARMACTA MARTHA ISABEL   ·   Los Olivos SFIDA
--    hoy le dice "Hola Surco"
update clientes set nombre_pila = 'Martha' where nombre = 'SURCO ARMACTA MARTHA ISABEL';

-- UGAZ TOLEDO BLANCA FLOR   ·   Los Olivos SFIDA
--    hoy le dice "Hola Ugaz"
update clientes set nombre_pila = 'Flor' where nombre = 'UGAZ TOLEDO BLANCA FLOR';

-- VELASCO LOAYZA DE SAAVEDRA MARITZA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Velasco"
update clientes set nombre_pila = 'Maritza' where nombre = 'VELASCO LOAYZA DE SAAVEDRA MARITZA';

-- VERA CACERES MARIA EUGENIA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Vera"
update clientes set nombre_pila = 'Maria' where nombre = 'VERA CACERES MARIA EUGENIA';

-- VIDAL ESPINOZA ANA CECILIA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Vidal"
update clientes set nombre_pila = 'Ana' where nombre = 'VIDAL ESPINOZA ANA CECILIA';

-- VILELA CRUZ YESSICA ISABEL   ·   Los Olivos SFIDA
--    hoy le dice "Hola Vilela"
update clientes set nombre_pila = 'Isabel' where nombre = 'VILELA CRUZ YESSICA ISABEL';

-- VILLANUEVA BRAVO DE VIZA SOFIA IRENE   ·   Los Olivos SFIDA
--    hoy le dice "Hola Villanueva"
update clientes set nombre_pila = 'Sofia' where nombre = 'VILLANUEVA BRAVO DE VIZA SOFIA IRENE';

-- VILLANUEVA FUENTES RIVERA FLOR ESPERANZA   ·   Los Olivos SFIDA
--    hoy le dice "Hola Villanueva"
update clientes set nombre_pila = 'Flor' where nombre = 'VILLANUEVA FUENTES RIVERA FLOR ESPERANZA';

-- ---------------------------------------------------------
-- COMPROBAR — lista las fichas ya resueltas con su saludo
-- ---------------------------------------------------------
select nombre, nombre_pila, tienda
from clientes
where nombre_pila is not null and nombre_pila <> ''
order by nombre;