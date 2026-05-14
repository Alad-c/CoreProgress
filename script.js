// --- UTILS ---
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Helper function to check if the user is signed in.
 * It shows an alert if the user is a guest.
 */
function checkAuth() {
    const username = localStorage.getItem('currentUser');
    if (!username) {
        alert("Please Sign In to save your progress!");
        return false;
    }
    return true;
}

/**
 * Sends workout data to the server database.
 * UPDATED: Now accepts an optional opponent parameter.
 */
function saveWorkoutToServer(type, value, opponent = null) {
    const username = localStorage.getItem('currentUser');
    if (!username) return false;

    fetch('/log-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, type, value, opponent }) // Added opponent here
    })
    .then(response => response.json())
    .then(data => {
        console.log("Database response:", data.message);
    })
    .catch(err => console.error("Error saving workout:", err));

    return true;
}


// --- STREET WORKOUT ---
let sets = 0, totalWorkouts = 0, timerInterval;

function addSet() {
    sets++; 
    document.getElementById('set-count').innerText = sets;
}

function startRestTimer(seconds) {
    clearInterval(timerInterval);
    const display = document.getElementById('timer-display');
    display.className = 'timer-active';
    let timeLeft = seconds;
    
    timerInterval = setInterval(() => {
        timeLeft--;
        let mins = Math.floor(timeLeft / 60);
        let secs = timeLeft % 60;
        display.innerText = `Rest: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            display.className = 'timer-inactive';
            display.innerText = "Rest Over!";
            document.getElementById('beep-sound').play();
            alert("Rest finished! Next set now.");
        }
    }, 1000);
}

function resetWorkoutSets() {
    if(confirm("Reset sets?")) {
        sets = 0; 
        document.getElementById('set-count').innerText = 0;
        clearInterval(timerInterval);
        document.getElementById('timer-display').innerText = "Rest: 03:00";
        document.getElementById('timer-display').className = 'timer-inactive';
    }
}

function stopWorkoutTimer() {
    clearInterval(timerInterval);
    document.getElementById('timer-display').innerText = "Rest: 03:00";
    document.getElementById('timer-display').className = 'timer-inactive';
}

function completeWorkout() {
    // 1. FIRST check if user is logged in
    if (!checkAuth()) return;

    // 2. THEN check if there is data to save
    if (sets === 0) {
        return alert("Add at least one set!");
    }

    saveWorkoutToServer("Street Workout", `${sets} sets`);
    
    totalWorkouts++;
    document.getElementById('workout-total').innerText = totalWorkouts;
    sets = 0;
    document.getElementById('set-count').innerText = 0;
    stopWorkoutTimer();
    alert("Workout saved to database! 💪");
}


// --- SQUASH ---
let myPts = 0, oppPts = 0, myGms = 0, oppGms = 0, wins = 0, losses = 0;

function addPoint(player) {
    if (player === 'me') myPts++; else oppPts++;
    document.getElementById('score-me').innerText = myPts;
    document.getElementById('score-opponent').innerText = oppPts;
    
    if (myPts >= 11 && (myPts - oppPts) >= 2) { 
        myGms++; 
        alert("Game Point: Me!"); 
        resetPoints(); 
    }
    else if (oppPts >= 11 && (oppPts - myPts) >= 2) { 
        oppGms++; 
        alert("Game Point: Opponent!"); 
        resetPoints(); 
    }
    updateGames();
}

function resetPoints() { 
    myPts = 0; oppPts = 0; 
    document.getElementById('score-me').innerText = 0; 
    document.getElementById('score-opponent').innerText = 0; 
}

function updateGames() { 
    document.getElementById('games-me').innerText = myGms; 
    document.getElementById('games-opponent').innerText = oppGms; 
}

function completeMatch() {
    // 1. FIRST check if user is logged in
    if (!checkAuth()) return;

    // 2. THEN check if the match actually happened
    if (myGms === 0 && oppGms === 0) {
        return alert("Finish a game first!");
    }

    // 3. Get the opponent's name from the input field
    const opponentName = document.getElementById('opponent-input').value.trim();
    if (!opponentName) {
        return alert("Please enter the opponent's name!");
    }
    
    const score = `${myGms}:${oppGms}`;
    // Pass the opponent name to the server
    saveWorkoutToServer("Squash Match", score, opponentName);

    if (myGms > oppGms) wins++; else losses++;
    
    myGms = 0; 
    oppGms = 0; 
    updateGames(); 
    resetPoints();
    document.getElementById('opponent-input').value = ''; // Clear input

    alert("Match saved! 🏆");
    
    // Refresh the stats list after a short delay to allow DB insert
    setTimeout(loadSquashStats, 500); 
}


// --- RUNNING ---
let totalDist = 0;
let goalReached = false;

function completeRun() {
    if (goalReached) {
        alert("You already reached your weekly goal! Reset the week to start again.");
        return;
    }

    // If the next log reaches the 20km goal, we check auth
    if (totalDist + 5.0 >= 20.0) {
        if (!checkAuth()) return; // Stop if not logged in
        saveWorkoutToServer("Running Weekly Goal", "20.0 km");
    }

    // Add 5 km
    totalDist += 5.0;
    document.getElementById('run-distance').innerText = totalDist.toFixed(1) + " km";

    const statusEl = document.getElementById('run-status');
    const dateEl = document.getElementById('last-run-date');

    if (totalDist < 20.0) {
        if(statusEl) {
            statusEl.innerText = "In Progress";
            statusEl.className = "pending";
        }
    } 
    else if (totalDist >= 20.0) {
        goalReached = true;
        if(statusEl) {
            statusEl.innerText = "Completed";
            statusEl.className = "done";
        }
        if(dateEl) dateEl.innerText = new Date().toLocaleDateString();
        
        const goalMsg = document.getElementById('goal-reached-msg');
        if (goalMsg) goalMsg.classList.add('show-msg');
        
        alert("Weekly goal of 20 km reached! Saved to database. 🏃‍♂️💨");
    }
}

function resetWeek() {
    if(confirm("Reset all running progress for the week?")) {
        totalDist = 0; 
        goalReached = false;
        document.getElementById('run-distance').innerText = "0.0 km";
        const goalMsg = document.getElementById('goal-reached-msg');
        if (goalMsg) goalMsg.classList.remove('show-msg');
        const dateEl = document.getElementById('last-run-date');
        if (dateEl) dateEl.innerText = "None";
        const statusEl = document.getElementById('run-status');
        if (statusEl) {
            statusEl.innerText = "Resting";
            statusEl.className = "pending";
        }
    }
}
// --- INTERACTIVE CHART (CHART.JS) ---
let myChart = null; // Store the chart instance globally to destroy it before re-rendering

function loadAnalytics() {
    const user = localStorage.getItem('currentUser');
    if (!user) return; // Exit if the user is not logged in

    // Display the analytics card
    document.getElementById('analytics-section').style.display = 'block';

    // Fetch aggregated data from the analytics route
    fetch('/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user })
    })
    .then(res => res.json())
    .then(response => {
        if (!response.success || response.data.length === 0) return;

        // 1. Extract labels (workout types) and data values (counts) from the response
        const labels = response.data.map(item => item.type);
        const dataValues = response.data.map(item => item.count);

        // 2. Select the canvas context
        const ctx = document.getElementById('activityChart').getContext('2d');

        // Destroy the existing chart instance if it exists to prevent overlapping
        if (myChart) {
            myChart.destroy();
        }

        // 3. Render the new bar chart
        myChart = new Chart(ctx, {
            type: 'bar', // Specify a bar chart
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Workouts',
                    data: dataValues,
                    backgroundColor: [
                        'rgba(56, 189, 248, 0.6)',  // Light Blue
                        'rgba(167, 139, 250, 0.6)', // Purple
                        'rgba(52, 211, 153, 0.6)'   // Green
                    ],
                    borderColor: [
                        'rgba(56, 189, 248, 1)',
                        'rgba(167, 139, 250, 1)',
                        'rgba(52, 211, 153, 1)'
                    ],
                    borderWidth: 1,
                    borderRadius: 5 // Rounded bar corners
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, color: '#94a3b8' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' },
                        grid: { display: false } // Hide vertical grid lines
                    }
                },
                plugins: {
                    legend: { display: false } // Hide the top legend
                }
            }
        });
    })
    .catch(err => console.error("Error loading analytics:", err));
}

// --- SQUASH RIVALS ANALYTICS ---
function loadSquashStats() {
    const user = localStorage.getItem('currentUser');
    if (!user) return;

    fetch('/squash-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user })
    })
    .then(res => res.json())
    .then(response => {
        if (!response.success || response.stats.length === 0) return;

        const container = document.getElementById('squash-analytics-container');
        const list = document.getElementById('squash-stats-list');
        
        container.style.display = 'block';
        list.innerHTML = ''; // Clear old data

        // Generate HTML for each opponent
        response.stats.forEach(stat => {
            // Calculate win rate percentage safely
            const winRate = stat.total_matches > 0 
                ? Math.round((stat.wins / stat.total_matches) * 100) 
                : 0;

            list.innerHTML += `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; padding: 5px; background: rgba(255,255,255,0.05); border-radius: 4px;">
                    <span>🎾 vs <strong>${stat.opponent_name}</strong></span>
                    <span>${stat.wins}W / ${stat.total_matches}M (${winRate}%)</span>
                </div>
            `;
        });
    })
    .catch(err => console.error("Error loading squash stats:", err));
}

// Add this to the existing DOMContentLoaded listener at the very bottom
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('currentUser')) {
        loadAnalytics();    // Existing Chart.js load
        loadSquashStats();  // NEW: Load squash rivals
    }
});