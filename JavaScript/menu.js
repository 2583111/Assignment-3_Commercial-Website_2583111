const root = ".";

const menuItems = [
    { name: "Home", href: root + "/index.html" },
    { name: "Theory", href: `${root}/Theory/index.html` },
    { name: "Design", href: `${root}/Design/index.html` },
];

export function initialise(currentPage) {
    const nav = document.querySelector("header > nav");
    const ul = document.createElement("ul");
    
    // Create menu items dynamically
    for (let menuItem of menuItems) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.innerText = menuItem.name;
        a.setAttribute("href", menuItem.href);

        // Highlight the current page
        if (currentPage === menuItem.name) {
            a.classList.add("current");
        }

        li.appendChild(a);
        ul.appendChild(li);
    }

    nav.appendChild(ul);
}