import Products1 from "@/app/components/Product";

export default function Home() {
  return (
    <div>
       <Products1 name="iPhone 16" price={30} />
      <Products1 name="Samsung S25" price={50} />
      <Products1 name="Google Pixel" price={39} />
    </div>
  );
}