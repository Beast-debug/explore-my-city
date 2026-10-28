# Explore My City — Bengaluru 🌆

## 📌 About the Project
**Explore My City** is a web-based application that helps users discover popular places in Bengaluru, explore destinations by category, and create personalized trip plans. Users can select places, estimate their trip budget, and save, load, edit, or delete their trips.

## ✨ Features
- Browse popular destinations in Bengaluru.
- Search places by name.
- Filter destinations by category.
- View place descriptions, images, locations, and estimated costs.
- Add or remove places from a trip planner.
- Calculate the estimated total trip cost.
- Save and load trip plans.
- Edit existing trips and delete saved trips.
- Store destination and trip information in a MySQL database.

## 🛠️ Technologies Used
- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Database Connectivity:** MySQL2
- **Other Tools:** VS Code, npm

## 📂 Project Structure

```text
explore-my-city/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── .env
│   └── package.json
├── .gitignore
└── README.md
```

## 🏙️ Destinations Included
- Lalbagh Botanical Garden
- Cubbon Park
- Bangalore Palace
- VV Puram Food Street
- ISKCON Temple
- Visvesvaraya Industrial and Technological Museum
- Commercial Street

## ⚙️ Setup and Installation

### Prerequisites
Install Node.js and MySQL Server before running the project.

### 1. Clone the Repository
```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd explore-my-city
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Configure Environment Variables
Create a `.env` file inside the `backend` folder and add your MySQL configuration:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=explore_my_city
PORT=5000
```

Replace `your_mysql_password` with your own MySQL password. Never upload your actual `.env` file to GitHub.

### 4. Set Up the Database
Create a MySQL database named `explore_my_city` and configure the required tables: `places`, `trips`, and `trip_places`.

Add the destination records to the `places` table before starting the application.

### 5. Start the Backend
From the `backend` folder, run:

```bash
node server.js
```

The backend API will run at:

`http://localhost:5000`

### 6. Open the Frontend
Open `frontend/index.html` in your browser. Keep the backend server running while using the application.

## 🔗 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/places` | Retrieve all destinations |
| GET | `/api/places/:id` | Retrieve a destination by ID |
| POST | `/api/trips` | Create a trip |
| GET | `/api/trips` | Retrieve saved trips |
| GET | `/api/trips/:id` | Retrieve a specific trip |
| PUT | `/api/trips/:id` | Update a saved trip |
| DELETE | `/api/trips/:id` | Delete a saved trip |

## 🎯 Project Objective
The objective of this project is to provide a simple and user-friendly platform for exploring Bengaluru and planning trips based on personal interests and estimated costs.

## 🚀 Future Enhancements
- Add user registration and login.
- Integrate Google Maps for navigation.
- Add ratings and reviews for destinations.
- Provide personalized travel recommendations.
- Add real-time traffic and weather information.

## 👨‍💻 Developed As
An academic project for learning frontend development, backend API integration, and database management.
