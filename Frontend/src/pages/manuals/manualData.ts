/** Contenido literal del manual (contrato: odd/opendesign/criscom-adm-manuals/manuals-data.json). No editar textos. */
export interface ManualGuide { title: string; steps: string[] }
export interface ManualProfile { name: string; purpose: string; allowed: string[]; forbidden: string[]; workflow: ManualGuide[] }

export const COMMON_GUIDES: ManualGuide[] = [
  {
    "title": "Primer ingreso",
    "steps": [
      "Inicia sesión únicamente con tu cuenta personal; nunca compartas contraseña.",
      "Confirma tu nombre y perfil en la parte inferior del menú.",
      "Abre “Manual de mi perfil”: el sistema muestra solo las tareas que corresponden a tu acceso.",
      "Si una opción no aparece, no es un error: está reservada para otro nivel de responsabilidad."
    ]
  },
  {
    "title": "Cómo está ordenado el ERP",
    "steps": [
      "Dashboard resume lo importante.",
      "Ventas contiene la operación diaria: nueva venta, pedidos web, entregas y caja.",
      "Servicio técnico reúne ingresos, solicitudes, órdenes y armado de PCs.",
      "Inventario y compras controla existencias y reposición.",
      "Marketing administra ofertas, redes y banners.",
      "Administración agrupa los cambios menos frecuentes y de mayor riesgo."
    ]
  },
  {
    "title": "Reglas para todos",
    "steps": [
      "Verifica cliente, productos, cantidades y medio de pago antes de confirmar.",
      "No dupliques una operación si la pantalla demora: revisa primero el historial.",
      "No confirmes pagos que no puedas comprobar.",
      "Cierra sesión al terminar, especialmente en una PC compartida.",
      "Reporta cualquier diferencia de stock, caja o permisos a tu responsable."
    ]
  },
  {
    "title": "Solicitar acceso a otra área",
    "steps": [
      "Abre “Solicitudes de acceso”.",
      "Elige el área y explica la tarea concreta que necesitas realizar.",
      "Envía la solicitud y espera la aprobación de Crisitus.",
      "Vuelve a iniciar sesión cuando sea aprobada.",
      "El permiso vence o puede ser revocado; Importaciones nunca se delega."
    ]
  }
]

export const PROFILE_GUIDES: Record<string, ManualProfile> = {
  "master": {
    "name": "Cuenta maestra — Crisitus",
    "purpose": "Control total, seguridad, configuración y decisiones irreversibles del ERP.",
    "allowed": [
      "Todos los módulos operativos y administrativos",
      "Servicio técnico completo",
      "Usuarios, roles, afiliados y auditores temporales",
      "Pagos/POS, importaciones, SUNAT, marketing y auditoría"
    ],
    "forbidden": [
      "No usar la cuenta maestra para tareas rutinarias si puede hacerlas un perfil inferior",
      "No compartir credenciales ni conceder privilegios por comodidad"
    ],
    "workflow": [
      {
        "title": "Rutina recomendada",
        "steps": [
          "Revisa Dashboard y alertas.",
          "Supervisa ventas, pedidos web, entregas y caja.",
          "Atiende excepciones de Servicio técnico.",
          "Revisa inventario/compras y luego administración.",
          "Audita cambios de usuarios y operaciones críticas."
        ]
      },
      {
        "title": "Alta de un usuario",
        "steps": [
          "Abre Administración → Usuarios y accesos.",
          "Elige una cuenta registrada o crea una nueva.",
          "Asigna el perfil mínimo que necesita.",
          "Completa las opciones que aparezcan para ese rol.",
          "Confirma el resumen y comprueba que solo aparezcan sus módulos."
        ]
      }
    ]
  },
  "admin": {
    "name": "Administrador",
    "purpose": "Ser la mano derecha operativa de Crisitus sin poder desplazar ni alterar la cuenta maestra.",
    "allowed": [
      "Ventas, pedidos web, entregas y caja",
      "Inventario avanzado, proveedores, compras y cotizaciones",
      "Marketing, empresa/SUNAT y reportes operativos",
      "Superusuario temporal si Crisitus lo concede con fecha de fin"
    ],
    "forbidden": [
      "Quitar o modificar a Crisitus",
      "Concederse o extender su propio superusuario temporal",
      "Acceder a Importaciones",
      "Cambiar secretos o borrar trazabilidad"
    ],
    "workflow": [
      {
        "title": "Jornada del administrador",
        "steps": [
          "Revisa pedidos y pagos pendientes.",
          "Coordina entregas e incidencias.",
          "Supervisa caja, stock mínimo, costo y margen.",
          "Recibe compras y revisa cotizaciones.",
          "Actualiza Marketing solo después de comprobar stock y margen."
        ]
      },
      {
        "title": "Si recibiste superusuario temporal",
        "steps": [
          "Comprueba su fecha de expiración.",
          "Úsalo solo para la incidencia autorizada.",
          "No podrás modificar a Crisitus, Importaciones ni ampliar tu plazo.",
          "Al vencer, el servidor retira los privilegios automáticamente."
        ]
      }
    ]
  },
  "auditor": {
    "name": "Auditor temporal",
    "purpose": "Revisar pedidos, detectar diferencias y corregir incidencias operativas con trazabilidad durante un periodo limitado.",
    "allowed": [
      "Dashboard, pedidos web, entregas y estados",
      "Contrastar pagos, stock y documentos",
      "Corregir incidencias operativas dentro del alcance concedido",
      "Logs de auditoría y evidencia de cada corrección"
    ],
    "forbidden": [
      "Cambiar la configuración estructural del negocio",
      "Administrar usuarios, cuenta maestra o accesos",
      "Eliminar logs o evidencias",
      "Extender su propio vencimiento"
    ],
    "workflow": [
      {
        "title": "Proceso de auditoría",
        "steps": [
          "Confirma alcance y fecha de vencimiento.",
          "Compara pedido, pago, despacho, stock y comprobante.",
          "Corrige solo el dato operativo verificable y deja motivo/evidencia.",
          "Filtra los logs para comprobar el resultado.",
          "Escala a Crisitus lo que requiera permisos superiores."
        ]
      }
    ]
  },
  "seller": {
    "name": "Vendedor interno",
    "purpose": "Vender, consultar stock y cuadrar únicamente su operación.",
    "allowed": [
      "Registrar ventas e historial autorizado",
      "Consultar inventario disponible",
      "Caja diaria según su asignación",
      "Manual de vendedor"
    ],
    "forbidden": [
      "Crear categorías o registrar compras",
      "Modificar precios globales, marketing o SUNAT",
      "Administrar usuarios, roles o auditoría",
      "Confirmar operaciones ajenas sin autorización"
    ],
    "workflow": [
      {
        "title": "Realizar una venta",
        "steps": [
          "Abre Ventas → Registrar venta.",
          "Busca o escanea productos y valida el stock.",
          "Selecciona cliente, comprobante y medio de pago.",
          "Revisa el total antes de confirmar.",
          "Entrega o imprime el comprobante y verifica la venta en el historial."
        ]
      },
      {
        "title": "Cierre de turno",
        "steps": [
          "Revisa tus ventas anuladas o pendientes.",
          "Compara efectivo y pagos electrónicos con el sistema.",
          "Registra el cierre de caja.",
          "Reporta diferencias antes de retirarte."
        ]
      }
    ]
  },
  "affiliate": {
    "name": "Negocio afiliado",
    "purpose": "Administrar una tienda independiente dentro del ERP, sin mezclar sus datos con CRISCOM.",
    "allowed": [
      "Crear, publicar y administrar sus propios productos",
      "Ventas, pedidos, pagos en efectivo, inventario, compras, cotizaciones y caja propias",
      "Servicio técnico propio si Crisitus habilita el área",
      "Mi negocio, indicadores y suscripción"
    ],
    "forbidden": [
      "Ver ventas, stock, caja o servicio de CRISCOM u otro afiliado",
      "Recibir solicitudes técnicas de la web de CRISCOM",
      "Administrar usuarios globales, SUNAT o Importaciones",
      "Confirmar pagos de pedidos mixtos o ajenos"
    ],
    "workflow": [
      {
        "title": "Operación del afiliado",
        "steps": [
          "Comprueba que tu negocio figure activo.",
          "Crea productos con costo, precio, stock y publicación web.",
          "Registra compras y controla costo promedio y margen.",
          "Confirma efectivo solo en pedidos totalmente propios.",
          "En compras web con tarjeta, el sistema agrega 5% al subtotal afiliado.",
          "Consulta Mi negocio y paga la suscripción antes del vencimiento."
        ]
      }
    ]
  },
  "technician": {
    "name": "Técnico",
    "purpose": "Gestionar el ciclo completo de Servicio Técnico sin acceder a la administración general.",
    "allowed": [
      "Ingresos, órdenes, diagnósticos y estados",
      "Cotizaciones técnicas, repuestos, pagos, evidencias y garantías",
      "Bandeja WhatsApp vinculada por OpenClaw y publicación selectiva de avances",
      "Asistente de diagnóstico como apoyo sujeto a revisión humana",
      "Solicitudes web cuando pertenece a CRISCOM",
      "Solicitar a Crisitus acceso temporal a otras áreas"
    ],
    "forbidden": [
      "Publicar al cliente fotos sin revisar datos o contenido sensible",
      "Aceptar como diagnóstico una hipótesis de IA sin pruebas",
      "Ver órdenes técnicas de otro negocio",
      "Una tienda afiliada no recibe solicitudes de la web de CRISCOM",
      "Administrar usuarios, secretos o importaciones",
      "Concederse permisos o ampliar su vigencia"
    ],
    "workflow": [
      {
        "title": "Atender un servicio",
        "steps": [
          "Registra el ingreso, autorización de WhatsApp y estado físico con evidencias.",
          "Comparte el código de orden para vincular correctamente mensajes y fotos.",
          "Diagnostica con mediciones; la IA solo propone hipótesis que el técnico debe revisar.",
          "Genera la cotización y espera aprobación documentada.",
          "Reserva repuestos, registra trabajo, pruebas y avances en el expediente.",
          "Revisa cada foto recibida y publica solo las que el cliente deba ver.",
          "Confirma el pago; el ERP genera la venta y clasificación fiscal correspondiente.",
          "Entrega únicamente sin saldo pendiente y con garantía documentada."
        ]
      }
    ]
  }
}

export const PROFILE_LABELS: Record<string, string> = {
  "master": "Cuenta maestra",
  "admin": "Administrador",
  "auditor": "Auditor temporal",
  "seller": "Vendedor interno",
  "affiliate": "Negocio afiliado",
  "technician": "Técnico"
}

export const MANUAL_FOOTER = "Tu acceso se calcula con tu rol, tipo de vendedor y cuenta. Si necesitas una función adicional, solicítala a la cuenta maestra; no compartas usuarios."
export const PROFILE_NOTE = "se calcula con tu rol y tipo de vendedor"
