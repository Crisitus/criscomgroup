# Backend para Sistema de Gestión de Inventario

API REST para gestionar productos y categorías con códigos de barras.

## Pruebas para Categorías

### Registra un usuario

Método: POST 
URL: {{baseUrl}}/api/auth/register


**Body:**

   ```bash
{
  "name": "Usuario Prueba",
  "email": "usuario@test.com",
  "password": "123456"
}
  ```
### Inicia sesión para obtener un token JWT

Método: POST 
URL: {{baseUrl}}/api/auth/login


**Body:**

   ```bash
{
  "email": "usuario@test.com",
  "password": "123456"
}
  ```

#### Guarda el token JWT de la respuesta.

Este token debe ir en cada peticion

Authorization: Bearer [tu_token_jwt]

### Crear una categoría

Método: POST
URL: {{baseUrl}}/categorias


**Body:**

   ```bash
{
  "nombre": "Electrónicos",
  "descripcion": "Productos electrónicos y accesorios"
}
  ```

### Obtener todas las categorías

Método: GET
URL: {{baseUrl}}/categorias

### Obtener una categoría por ID

Método: GET
URL: {{baseUrl}}/categorias/1

### Obtener una categoría por código de barras

Método: GET
URL: {{baseUrl}}/categorias/barcode/[código-de-barras]

Reemplaza [código-de-barras] con el valor obtenido al crear la categoría

### Actualizar una categoría

Método: PUT
URL: {{baseUrl}}/categorias/1

**Body:**

   ```bash
{
  "nombre": "Electrónicos Actualizados",
  "descripcion": "Productos electrónicos y accesorios de última generación"
}
  ```

### Eliminar una categoría

Método: DELETE
URL: {{baseUrl}}/categorias/1

## Pruebas para Productos

### Crear un producto

Método: POST
URL: {{baseUrl}}/productos

**Body:**

   ```bash
{
  "sku": "PROD-001",
  "nombre": "Smartphone XYZ",
  "descripcion": "Smartphone de última generación",
  "precio_unitario": 599.99,
  "stock": 50,
  "id_categoria": 1
}
  ```
### Obtener todos los productos

Método: GET
URL: {{baseUrl}}/productos

### Obtener un producto por ID

Método: GET
URL: {{baseUrl}}/productos/1

### Obtener productos por categoría

Método: GET
URL: {{baseUrl}}/productos/categoria/1

### Actualizar un producto

Método: PUT
URL: {{baseUrl}}/productos/1

**Body:**

   ```bash
{
  "sku": "PROD-001",
  "nombre": "Smartphone XYZ Pro",
  "descripcion": "Versión actualizada del smartphone",
  "precio_unitario": 699.99,
  "stock": 40,
  "id_categoria": 1
}
  ```

### Actualizar parcialmente un producto

Método: PATCH
URL: {{baseUrl}}/productos/1

**Body:**

   ```bash
{
  "precio_unitario": 649.99,
  "stock": 45
}
  ```

### Actualizar el stock de un producto

Método: PATCH
URL: {{baseUrl}}/productos/1/stock

**Body:**

   ```bash
{
  "cantidad": 35
}
  ```

### Disminuir el stock de un producto

Método: PATCH
URL: {{baseUrl}}/productos/1/decrement

**Body:**

   ```bash
{
  "cantidad": 1
}
  ```

### Eliminar un producto

Método: DELETE
URL: {{baseUrl}}/productos/1

## Pruebas para Codigo de Barras

### Crear codigos de barras

Método: POST
URL: {{baseUrl}}/codigos-barras/producto/1

**Body:**

   ```bash
{
  {
  "codigos_barras": [
    "asdsasdasda"
  ]
}
}
  ```
### Verificar Códigos de Barras Creados

Método: GET
URL: {{baseUrl}}/codigos-barras/producto/1

### Buscar Producto Por Codigo de Barras

Método: GET
URL: {{baseUrl}}/codigos-barras/{{codigo de barras}}/producto

## Pruebas para Ventas

### Crear un producto

Método: POST
URL: {{baseUrl}}/ventas

**Body:**

   ```bash
{
  "id_cajero": 1,
  "metodo_pago": "tarjeta",
  "observaciones": "Venta con nuevo sistema de IGV",
  "items": [
    {
      "codigo_barras": "abs-añsk%%%asiq-asdo_A"
    },
    {
      "codigo_barras": "asdsasdasda"
    },
    {
      "codigo_barras": "osopdsajdposad"
    }
  ]
}
  ```
### Obtener todas las ventas

Método: GET
URL: {{baseUrl}}/ventas

### Obtener una venta por ID

Método: GET
URL: {{baseUrl}}/ventas/1

### Obtener Obtener ventas por cajero

Método: GET
URL: {{baseUrl}}/ventas/cajero/1

### Obtener ventas por fecha

Método: GET
URL: {{baseUrl}}/ventas/fecha/2025-03-20

### Obtener ventas rango de fecha

Método: GET
URL: {{baseUrl}}/ventas/rango-fechas?fechaInicio=2025-03-01&fechaFin=2025-03-21