// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3Sx9IwJHwqVvwRjfdgNuWV7HwJ4llr9M",
  authDomain: "lumiverse-4b1de.firebaseapp.com",
  databaseURL: "https://lumiverse-4b1de-default-rtdb.firebaseio.com",
  projectId: "lumiverse-4b1de",
  storageBucket: "lumiverse-4b1de.firebasestorage.app",
  messagingSenderId: "262219457078",
  appId: "1:262219457078:web:d7ca3297ab27ea4a8bee97",
  measurementId: "G-7Q4J2Z506S"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage(); // Note: Storage might require payment plan