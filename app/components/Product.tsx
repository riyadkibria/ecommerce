type ProductProps = {
  name: string;
  price: number;
};

export default function Productsssss(props: ProductProps) {
  return (
    <>
      <h1>{props.name}</h1>
      <h1>{props.price}</h1>
    </>
  );
}