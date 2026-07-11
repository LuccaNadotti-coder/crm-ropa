// Departamentos y distritos del Perú.
// Lima (provincia) y Callao están completos porque suelen concentrar la mayoría
// de clientes de retail. Para el resto del país se incluyen las capitales de
// provincia y los distritos más comerciales. Si necesitas más distritos de
// algún departamento específico, agrégalos aquí mismo siguiendo el mismo formato.

export const PERU = {
  "Amazonas": ["Chachapoyas", "Bagua", "Bagua Grande"],
  "Áncash": ["Huaraz", "Chimbote", "Nuevo Chimbote"],
  "Apurímac": ["Abancay", "Andahuaylas"],
  "Arequipa": ["Arequipa (Cercado)", "Cayma", "Yanahuara", "Cerro Colorado", "José Luis Bustamante y Rivero", "Paucarpata"],
  "Ayacucho": ["Huamanga (Ayacucho)"],
  "Cajamarca": ["Cajamarca", "Jaén"],
  "Callao": ["Callao (Cercado)", "Bellavista", "La Perla", "La Punta", "Ventanilla", "Carmen de la Legua Reynoso", "Mi Perú"],
  "Cusco": ["Cusco (Cercado)", "Wanchaq", "San Sebastián", "Santiago", "San Jerónimo"],
  "Huancavelica": ["Huancavelica"],
  "Huánuco": ["Huánuco"],
  "Ica": ["Ica", "Chincha Alta", "Pisco"],
  "Junín": ["Huancayo", "El Tambo", "Chilca"],
  "La Libertad": ["Trujillo", "La Esperanza", "El Porvenir", "Víctor Larco Herrera", "Florencia de Mora"],
  "Lambayeque": ["Chiclayo", "José Leonardo Ortiz", "La Victoria (Chiclayo)"],
  "Lima": [
    "Cercado de Lima", "Ancón", "Ate", "Barranco", "Breña", "Carabayllo", "Chaclacayo",
    "Chorrillos", "Cieneguilla", "Comas", "El Agustino", "Independencia", "Jesús María",
    "La Molina", "La Victoria", "Lince", "Los Olivos", "Lurigancho (Chosica)", "Lurín",
    "Magdalena del Mar", "Miraflores", "Pachacámac", "Pucusana", "Pueblo Libre",
    "Puente Piedra", "Punta Hermosa", "Punta Negra", "Rímac", "San Bartolo", "San Borja",
    "San Isidro", "San Juan de Lurigancho", "San Juan de Miraflores", "San Luis",
    "San Martín de Porres", "San Miguel", "Santa Anita", "Santa María del Mar",
    "Santa Rosa", "Santiago de Surco", "Surquillo", "Villa El Salvador",
    "Villa María del Triunfo"
  ],
  "Loreto": ["Iquitos", "Punchana", "Belén"],
  "Madre de Dios": ["Puerto Maldonado", "Tambopata"],
  "Moquegua": ["Moquegua", "Ilo"],
  "Pasco": ["Cerro de Pasco", "Yanacancha"],
  "Piura": ["Piura", "Castilla", "Sullana", "Catacaos"],
  "Puno": ["Puno", "Juliaca"],
  "San Martín": ["Tarapoto", "Moyobamba"],
  "Tacna": ["Tacna", "Alto de la Alianza", "Ciudad Nueva"],
  "Tumbes": ["Tumbes"],
  "Ucayali": ["Pucallpa", "Callería"]
};

export const DEPARTAMENTOS = Object.keys(PERU);

// Tiendas de la empresa — edita esta lista con los nombres reales de tus 5 tiendas.
export const TIENDAS = ["San Miguel SFIDA", "Luzuriaga SFIDA", "Dominicana SFIDA", "Los Olivos SFIDA", "Chimu", "Online"];
