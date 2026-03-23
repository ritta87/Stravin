document.addEventListener("DOMContentLoaded", () => {
  fetchAllProducts();
});

async function fetchAllProducts() {
  const productGrid = document.getElementById("productGrid");

  try {
    const response = await fetch("/products");
    const data = await response.json();

    if (!data.success || data.products.length === 0) {
      productGrid.innerHTML = "<p>No products available</p>";
      return;
    }

    productGrid.innerHTML = "";

    data.products.forEach(product => {
      const card = document.createElement("div");
      card.classList.add("product-card");

      card.innerHTML = `
        <img src="${product.thumbnail || product.images?.[0]}" alt="${product.name}">
        <h3>${product.productname}</h3>
        
        <div class="price">₹${product.salePrice ?? product.price}</div>
      `;

      productGrid.appendChild(card);
    });

  } catch (error) {
    console.error("Home product fetch error:", error);
    productGrid.innerHTML = "<p>Unable to load products</p>";
  }
}

