// app/page.tsx

interface Product {
  id: number;
  title: string;
  price: number;
  stock: number;
  discount?: number;
}

export default function Home() {
  // Product Array
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
    {
      id: 4,
      title: "Monitor",
      price: 22000,
      stock: 8,
    },
  ];

  // ----------------------------
  // Function
  // ----------------------------
  const calculateFinalPrice = (product: Product): number => {
    if (product.discount) {
      return product.price - (product.price * product.discount) / 100;
    }

    return product.price;
  };

  // ----------------------------
  // Find Product
  // ----------------------------
  const laptop = products.find(
    (product) => product.title === "Laptop"
  );

  // ----------------------------
  // Filter Products
  // ----------------------------
  const availableProducts = products.filter(
    (product) => product.stock > 0
  );

  return (
    <main style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Mini E-commerce</h1>

      <hr />

      <h2>All Products</h2>

      {products.map((product) => (
        <div
          key={product.id}
          style={{
            border: "1px solid gray",
            borderRadius: 8,
            padding: 15,
            marginBottom: 20,
          }}
        >
          <h3>{product.title}</h3>

          <p>Price: ৳ {product.price}</p>

          <p>
            Final Price: ৳ {calculateFinalPrice(product)}
          </p>

          <p>Stock: {product.stock}</p>

          <p>
            Status:
            {product.stock > 0
              ? " ✅ In Stock"
              : " ❌ Out of Stock"}
          </p>

          <p>
            Discount:
            {product.discount
              ? `${product.discount}%`
              : "No Discount"}
          </p>
        </div>
      ))}

      <hr />

      <h2>Find Product</h2>

      {laptop ? (
        <div>
          <h3>{laptop.title}</h3>
          <p>Price: ৳ {laptop.price}</p>
        </div>
      ) : (
        <p>Product Not Found</p>
      )}

      <hr />

      <h2>Available Products</h2>

      {availableProducts.map((product) => (
        <p key={product.id}>
          {product.title} ({product.stock} pcs)
        </p>
      ))}
    </main>
  );
}