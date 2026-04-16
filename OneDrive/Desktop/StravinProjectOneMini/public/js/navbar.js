
async function loadCartCount(){
  try{
    const res = await fetch('/cart/count')
    const data = await res.json()

    const cartEl = document.getElementById('cartCount')
    if(cartEl){
      cartEl.innerText = data.count
    }
  }catch(err){
    console.log("Cart count error", err)
  }
}

document.addEventListener("DOMContentLoaded", loadCartCount)
