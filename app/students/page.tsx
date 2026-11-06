// app/page.tsx

interface Product {
  id: number;
  title: string;
  price: number;
  stock: number;
  discount?: number;
}

export default function Home() {
  const products: Product[] = [
    {
      id: 1,
      title: "Laptop",
      price: 65000,
      stock: 5,
      discount: 10,
    },
    {
      id: 2,
      title: "Mouse",
      price: 800,
      stock: 20,
    },
    {
      id: 3,
      title: "Keyboard",
      price: 2500,
      stock: 0,
      discount: 5,
    },
  ];

  return (
    <main style={{ padding: 40 }}>
      <h1>Product List</h1>

      {products.map((product) => (
        <div
          key={product.id}
          style={{
            border: "1px solid gray",
            padding: 16,
            marginBottom: 20,
            borderRadius: 8,
          }}
        >
          <h2>{product.title}</h2>

          <p>Price: ৳{product.price}</p>

          <p>Stock: {product.stock}</p>

          <p>
            Status:
            {product.stock > 0 ? " ✅ In Stock" : " ❌ Out of Stock"}
          </p>

          <p>
            Discount:
            {product.discount ? `${product.discount}%` : "No Discount"}
          </p>
        </div>
      ))}
    </main>
  );
}