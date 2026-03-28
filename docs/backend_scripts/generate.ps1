$resources = @(
  "products", "stocks", "sales", "invoices", "customers", "suppliers", "deliveries"
)

foreach ($res in $resources) {
  npx @nestjs/cli g module $res --no-spec
  npx @nestjs/cli g service $res --no-spec
  npx @nestjs/cli g controller $res --no-spec
}
