**# 🚀 SignalNet**  

**## Real-Time Crisis Intelligence \& Dynamic Risk Zoning Engine**



**SignalNet is a real-time disaster intelligence system that ingests live multi-source signals, clusters anomalies spatially, calculates severity and confidence scores, predicts stabilization ETA, and visualizes dynamic danger zones on an interactive map.**



**---**



**## 🛠 Built With**



**- Node.js – Backend processing**  

**- Redis – Event streaming \& caching**  

**- WebSockets (Socket.io) – Real-time updates**  

**- SQLite – Event persistence**  

**- React + Leaflet – Frontend visualization**  

**- Docker – Containerization**  



**---**



**## 📌 Problem Statement**



**During disasters:**



**- Information is fragmented**  

**- Signals arrive from multiple unverified sources**  

**- Decision-makers lack severity prioritization**  

**- No predictive stabilization indicator exists**  



**\*\*Result → Delayed and inefficient response.\*\***



**---**



**## 💡 Solution**



**SignalNet provides:**



**- ✔ Multi-source signal ingestion (social + sensor simulation)**  

**- ✔ Spatial anomaly clustering**  

**- ✔ Severity and confidence scoring**  

**- ✔ Dynamic centroid drift tracking (moving danger zone)**  

**- ✔ ETA prediction for stabilization**  

**- ✔ Real-time alert streaming**  

**- ✔ Interactive geospatial visualization**  



**---**



**## 🧠 Core Features**



**### 1️⃣ Dynamic Risk Zone**



**- Red zone auto-expands for severity ≥ 7**  

**- Zone drifts based on centroid movement**  

**- Movement velocity color-coded (slow → fast)**  



**---**



**### 2️⃣ Confidence Scoring Engine**



**Based on:**



**- Signal diversity**  

**- Signal consistency**  

**- Recency weighting**  



**Filters false positives and reduces noise.**



**---**



**### 3️⃣ ETA Prediction Engine**



**Uses:**



**- Signal arrival rate**  

**- Severity trend slope**  

**- 5-minute growth delta**  



**Predicts estimated minutes until system stabilization.**



**Displayed as:**



    **Estimated Stabilization: X minutes**



**---**



**### 4️⃣ Real-Time Alerts**



**- WebSocket-based live streaming**  

**- Critical alerts auto-highlighted**  

**- Dashboard event resolution system**  



**---**



**### 5️⃣ Simulation \& Testing Engine**



**Includes structured test scripts to simulate:**



**- Flood scenarios**  

**- Movement drift triggers**  

**- Confidence threshold triggers**  

**- Database validation checks**  



**---**



**## 🏗 Architecture**



**<p align="center">**

  **<img src="assets/architecture.png" width="850">**

**</p>**



**### System Flow**



**Signal Sources**  

**→ Backend Ingestion**  

**→ Clustering Engine**  

**→ Severity \& Confidence Model**  

**→ ETA Predictor**  

**→ Redis Layer**  

**→ WebSocket Broadcast**  

**→ Frontend Dashboard**  



**---**



**## 📂 Project Structure**



    **SignalNet/**

    **│**

    **├── backend/**

    **│   ├── engine/**

    **│   ├── routes/**

    **│   ├── tests/**

    **│   ├── scripts/**

    **│   ├── db.js**

    **│   ├── schema.sql**

    **│   └── server.js**

    **│**

    **├── frontend/**

    **│   ├── src/**

    **│   ├── public/**

    **│   └── vite.config.js**

    **│**

    **├── assets/**

    **├── README.md**

    **└── .gitignore**



**Note: node\_modules/ and dist/ are intentionally excluded from version control.**



**---**



**## ⚙️ How To Run**



**### 1️⃣ Start Redis (Docker)**



    **docker run -d --name redis -p 6379:6379 redis**



**### 2️⃣ Run Backend**



    **cd backend**

    **npm install**

    **node server.js**



**Backend runs at:**



    **http://localhost:3000**



**### 3️⃣ Run Frontend**



    **cd frontend**

    **npm install**

    **npm run dev**



**Frontend runs at:**



    **http://localhost:5173**



**---**



**## 📸 Screenshots**



**(Add dashboard images inside the `assets/` folder and reference them like below)**



    **!\[Dashboard](assets/dashboard.png)**



**---**



**## 🎯 Future Improvements**



**- Offline mesh-based emergency mode**  

**- ML-based anomaly scoring**  

**- Multi-city scalability**  

**- SMS / Automated leaflet dispatch**  

**- Government API integration**  



**---**



**## 💼 Portfolio Context**



**This project demonstrates:**



**- Distributed system design**  

**- Real-time event streaming architecture**  

**- Spatial clustering logic**  

**- Risk modeling and prediction**  

**- Cloud-ready infrastructure thinking**  

**- Production-grade project structuring**  



**---**



**## 📜 License**



**MIT License**

