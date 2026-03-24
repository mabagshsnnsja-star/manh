document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const navItems = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view');
    const ratingForm = document.getElementById('rating-form');
    const successMessage = document.getElementById('success-message');
    const newRatingBtn = document.getElementById('new-rating-btn');
    const submitBtn = document.getElementById('submit-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    
    // Star Rating Elements
    const foodStars = document.querySelectorAll('.star-rating[data-name="food-rating"] i');
    const serviceStars = document.querySelectorAll('.star-rating[data-name="service-rating"] i');
    
    // Test date group
    const testDateGroup = document.querySelector('.test-date-group');
    if(testDateGroup) testDateGroup.style.display = 'block';
    
    // State
    let ratings = {
        food: 0,
        service: 0
    }; 

    // Initialize date input
    const dateInput = document.getElementById('test-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    let chartInstance = null;

    // ---- Navigation ----
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Switch view
            const viewId = item.getAttribute('data-view');
            views.forEach(view => {
                view.classList.remove('active');
                if(view.id === viewId) {
                    view.classList.add('active');
                    if (viewId === 'dashboard-view') {
                        renderDashboard();
                    }
                }
            });
        });
    });

    // ---- Star Rating Logic ----
    function handleStarHover(stars, value) {
        stars.forEach(star => {
            if (parseInt(star.getAttribute('data-value')) <= value) {
                star.classList.replace('fa-regular', 'fa-solid');
                star.style.color = 'var(--star-active)';
            } else {
                star.classList.replace('fa-solid', 'fa-regular');
                star.style.color = 'var(--star-inactive)';
            }
        });
    }

    function handleStarClick(stars, value, type) {
        ratings[type] = value;
        stars.forEach(star => {
            if (parseInt(star.getAttribute('data-value')) <= value) {
                star.classList.replace('fa-regular', 'fa-solid');
                star.style.color = 'var(--star-active)';
            } else {
                star.classList.replace('fa-solid', 'fa-regular');
                star.style.color = 'var(--star-inactive)';
            }
        });
        checkFormValidity();
    }

    function setupStars(stars, type) {
        stars.forEach(star => {
            const val = parseInt(star.getAttribute('data-value'));
            
            star.addEventListener('mouseover', () => handleStarHover(stars, val));
            star.addEventListener('mouseout', () => {
                handleStarHover(stars, ratings[type]); // Restore to clicked state
            });
            star.addEventListener('click', () => handleStarClick(stars, val, type));
        });
    }

    setupStars(foodStars, 'food');
    setupStars(serviceStars, 'service');

    function checkFormValidity() {
        if (ratings.food > 0 && ratings.service > 0) {
            submitBtn.removeAttribute('disabled');
        } else {
            submitBtn.setAttribute('disabled', 'true');
        }
    }

    // Initialize form state
    checkFormValidity();

    // ---- Form Submission ----
    ratingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (ratings.food === 0 || ratings.service === 0) return;

        const commentVal = document.getElementById('comments').value;
        const dateVal = document.getElementById('test-date').value || new Date().toISOString().split('T')[0];
        
        const newReview = {
            id: Date.now(),
            foodRating: ratings.food,
            serviceRating: ratings.service,
            comment: commentVal,
            date: dateVal,
            timestamp: new Date().toISOString()
        };

        // Save to LocalStorage
        const existingReviews = JSON.parse(localStorage.getItem('restaurant_reviews') || '[]');
        existingReviews.push(newReview);
        localStorage.setItem('restaurant_reviews', JSON.stringify(existingReviews));

        // Show success
        ratingForm.classList.add('hidden');
        successMessage.classList.remove('hidden');
    });

    // ---- Reset Form ----
    newRatingBtn.addEventListener('click', () => {
        ratings = { food: 0, service: 0 };
        document.getElementById('comments').value = '';
        
        // Reset stars
        handleStarHover(foodStars, 0);
        handleStarHover(serviceStars, 0);
        checkFormValidity();
        
        successMessage.classList.add('hidden');
        ratingForm.classList.remove('hidden');
    });
    
    if(clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            if(confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu đánh giá?")) {
                localStorage.removeItem('restaurant_reviews');
                renderDashboard();
            }
        });
    }

    // ---- Dashboard Logic ----
    function getPast7Days() {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    }

    function renderDashboard() {
        const reviews = JSON.parse(localStorage.getItem('restaurant_reviews') || '[]');
        
        // Calculate Totals and Averages
        const total = reviews.length;
        document.getElementById('total-reviews').textContent = total;
        
        if (total > 0) {
            const totalFood = reviews.reduce((sum, r) => sum + r.foodRating, 0);
            const totalService = reviews.reduce((sum, r) => sum + r.serviceRating, 0);
            
            document.getElementById('avg-food').textContent = (totalFood / total).toFixed(1);
            document.getElementById('avg-service').textContent = (totalService / total).toFixed(1);
        } else {
            document.getElementById('avg-food').textContent = '0.0';
            document.getElementById('avg-service').textContent = '0.0';
        }

        // Prepare Chart Data (Aggregate by Date)
        const labels = getPast7Days(); // Last 7 days including today limit
        
        // Find all unique dates in the dataset, sort them
        const allDatesSet = new Set(reviews.map(r => r.date));
        // Add last 7 days to the set to ensure we have a good baseline
        labels.forEach(d => allDatesSet.add(d));
        
        let allDates = Array.from(allDatesSet).sort();
        // If there are too many dates, just take the last 14
        if (allDates.length > 14) {
            allDates = allDates.slice(-14);
        }

        const foodData = [];
        const serviceData = [];

        allDates.forEach(dateStr => {
            const dayReviews = reviews.filter(r => r.date === dateStr);
            if (dayReviews.length > 0) {
                const fAvg = dayReviews.reduce((sum, r) => sum + r.foodRating, 0) / dayReviews.length;
                const sAvg = dayReviews.reduce((sum, r) => sum + r.serviceRating, 0) / dayReviews.length;
                foodData.push(fAvg);
                serviceData.push(sAvg);
            } else {
                foodData.push(null); // No data for this day
                serviceData.push(null);
            }
        });

        // Render Chart
        renderChart(allDates, foodData, serviceData);
        
        // Render Recent Reviews List
        renderRecentReviews(reviews);
    }

    function renderChart(labels, foodData, serviceData) {
        const ctx = document.getElementById('trendChart').getContext('2d');
        
        if (chartInstance) {
            chartInstance.destroy();
        }

        // Format labels for display (DD/MM)
        const displayLabels = labels.map(dateStr => {
            const [, m, d] = dateStr.split('-');
            return `${d}/${m}`;
        });

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: displayLabels,
                datasets: [
                    {
                        label: 'Món ăn',
                        data: foodData,
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        spanGaps: true,
                        fill: true
                    },
                    {
                        label: 'Phục vụ',
                        data: serviceData,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        spanGaps: true,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + Number(context.raw).toFixed(1) + ' sao';
                            }
                        }
                    }
                }
            }
        });
    }

    function renderRecentReviews(reviews) {
        const ul = document.getElementById('recent-reviews');
        ul.innerHTML = '';
        
        if (reviews.length === 0) {
            ul.innerHTML = '<li><p style="color: var(--text-muted); text-align: center; padding: 1rem;">Chưa có đánh giá nào.</p></li>';
            return;
        }

        // Sort by timestamp desc, take top 5
        const sorted = [...reviews].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

        sorted.forEach(rev => {
            const li = document.createElement('li');
            li.className = 'review-item';
            
            // Format date nicely
            const [y, m, d] = rev.date.split('-');
            const displayDate = `${d}/${m}/${y}`;

            const commentHtml = rev.comment ? `<p class="review-comment">"${rev.comment}"</p>` : '';

            li.innerHTML = `
                <div class="review-header">
                    <div class="review-scores">
                        <span><i class="fa-solid fa-burger" style="color:#f97316"></i> ${rev.foodRating}</span>
                        <span><i class="fa-solid fa-bell-concierge" style="color:#6366f1"></i> ${rev.serviceRating}</span>
                    </div>
                    <span class="review-date">${displayDate}</span>
                </div>
                ${commentHtml}
            `;
            ul.appendChild(li);
        });
    }
});
