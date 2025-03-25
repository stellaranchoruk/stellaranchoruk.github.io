document.addEventListener("DOMContentLoaded", function () {
  // Mobile menu toggle
  const menuToggle = document.querySelector(".menu-toggle");
  const header = document.querySelector("header.page-header");
  if (menuToggle && header) {
    menuToggle.addEventListener("click", function () {
      header.classList.toggle("menu-opened");
    });
  }
  // Mobile dropdown toggle for "Our Mirrored Assets"
  const dropdownToggle = document.querySelector("nav .dropdown .dropdown-toggle");
  if (dropdownToggle) {
    dropdownToggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const menu = this.nextElementSibling;
      menu.style.display = (menu.style.display === "block") ? "none" : "block";
    });
  }
  // Close dropdown if clicking outside
  document.addEventListener("click", function (e) {
    const dropdownMenu = document.querySelector("nav .dropdown .dropdown-menu");
    if (dropdownMenu && !dropdownMenu.contains(e.target) && !dropdownToggle.contains(e.target)) {
      dropdownMenu.style.display = "none";
    }
  });
});
