document.addEventListener("DOMContentLoaded", function () {
    const starryBackground = document.createElement('div');
    starryBackground.id = 'starry-background';
    document.body.appendChild(starryBackground);
  
    const numStars = 400;  // Increase for more stars
    const starSizes = ['small', 'medium', 'large'];
  
    for (let i = 0; i < numStars; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      
      // Randomly assign size class
      const size = starSizes[Math.floor(Math.random() * starSizes.length)];
      star.classList.add(size);
  
      // Randomly position the stars
      star.style.top = Math.random() * 100 + 'vh';
      star.style.left = Math.random() * 100 + 'vw';
  
      // Append to starry background
      starryBackground.appendChild(star);
    }
  });