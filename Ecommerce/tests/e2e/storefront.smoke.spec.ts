import { expect, test } from "@playwright/test"

const publicRoutes = [
  { path: "/", heading: /CRISCOM|Tecnología/i },
  { path: "/catalogo", heading: /catálogo|productos/i },
  { path: "/servicios", heading: /servicios/i },
  { path: "/servicio-tecnico", heading: /solicita una revisión/i },
  { path: "/solicitud-importacion", heading: /importa con nosotros/i },
  { path: "/contacto", heading: /contacto/i },
]

for (const route of publicRoutes) {
  test(`${route.path} responde y muestra contenido principal`, async ({ page }) => {
    const response = await page.goto(route.path, { waitUntil: "domcontentloaded" })
    expect(response?.status(), `${route.path} no debe responder con error`).toBeLessThan(400)
    await expect(page.locator("h1, h2").filter({ hasText: route.heading }).first()).toBeVisible()
  })
}

test("robots y sitemap son públicos y válidos", async ({ request }) => {
  const robots = await request.get("/robots.txt")
  expect(robots.ok()).toBeTruthy()
  await expect(robots.text()).resolves.toContain("Sitemap:")

  const sitemap = await request.get("/sitemap.xml")
  expect(sitemap.ok()).toBeTruthy()
  await expect(sitemap.text()).resolves.toContain("<urlset")
})

test("la ficha de producto publica metadata y datos estructurados", async ({ page, request }) => {
  const productsResponse = await request.get("/api/ecommerce/productos")
  expect(productsResponse.ok()).toBeTruthy()
  const products = (await productsResponse.json()) as Array<{ id_producto: number; nombre: string }>
  expect(products.length).toBeGreaterThan(0)

  const product = products[0]
  const response = await page.goto(`/producto/${product.id_producto}`, { waitUntil: "domcontentloaded" })
  expect(response?.status()).toBeLessThan(400)
  await expect(page).toHaveTitle(/CRISCOM/i)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/producto/${product.id_producto}$`))

  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(schemas.some((schema) => schema.includes('"@type":"Product"'))).toBeTruthy()
  expect(schemas.some((schema) => schema.includes('"@type":"BreadcrumbList"'))).toBeTruthy()
})

test("agregar un producto actualiza el carrito sin crear un pedido", async ({ page, request }) => {
  const productsResponse = await request.get("/api/ecommerce/productos")
  const products = (await productsResponse.json()) as Array<{ id_producto: number }>
  expect(products.length).toBeGreaterThan(0)

  await page.goto(`/producto/${products[0].id_producto}`)
  const addButton = page.getByRole("button", { name: /agregar.*carrito/i }).first()
  await expect(addButton).toBeVisible()
  await addButton.click()

  const storedCart = await page.evaluate(() => localStorage.getItem("catalogo_cart_items"))
  expect(storedCart).not.toBeNull()
  expect(JSON.parse(storedCart || "[]")).toHaveLength(1)
})
