import React, { useState, useEffect, useRef } from 'react';
import { Mic, Check, X, Plus, Trash2, Edit, Save, RefreshCw } from 'lucide-react';
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';

const ChoresChart = () => {
  // State for participants, current day, selected participant, and chores
  const [participants, setParticipants] = useState(['Seth', 'Nalyse', 'Lillian']);
  const [newParticipant, setNewParticipant] = useState('');
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [chores, setChores] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editingChore, setEditingChore] = useState(null);
  const [editText, setEditText] = useState('');
  const [lastSynced, setLastSynced] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // SpeechRecognition setup
  const recognition = useRef(null);

  // Firebase references
  const participantsDocRef = doc(db, 'choreChart', 'participants');
  const choresDocRef = doc(db, 'choreChart', 'chores');

  // Days of the week
  const daysOfWeek = ['Sun.', 'Mon.', 'Tues.', 'Wed.', 'Thur.', 'Fri.', 'Sat.'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get participants
        const participantsDoc = await getDoc(participantsDocRef);
        if (participantsDoc.exists() && participantsDoc.data().list) {
          setParticipants(participantsDoc.data().list);
        } else {
          // Initialize if not exists
          await setDoc(participantsDocRef, { list: participants });
        }

        // Get chores
        const choresDoc = await getDoc(choresDocRef);
        if (choresDoc.exists()) {
          setChores(choresDoc.data());
        } else {
          // Initialize if not exists
          await setDoc(choresDocRef, {});
        }

        setLastSynced(new Date());
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        // Fall back to localStorage
        const savedParticipants = localStorage.getItem('choreChart_participants');
        if (savedParticipants) setParticipants(JSON.parse(savedParticipants));

        const savedChores = localStorage.getItem('choreChart_chores');
        if (savedChores) setChores(JSON.parse(savedChores));

        setIsLoading(false);
      }
    };

    fetchData();

    // Set up real-time listeners
    const unsubParticipants = onSnapshot(participantsDocRef, (doc) => {
      if (doc.exists() && doc.data().list) {
        setParticipants(doc.data().list);
        setLastSynced(new Date());
      }
    });

    const unsubChores = onSnapshot(choresDocRef, (doc) => {
      if (doc.exists()) {
        setChores(doc.data());
        setLastSynced(new Date());
      }
    });

    // Clean up listeners
    return () => {
      unsubParticipants();
      unsubChores();
    };
  }, []);

  // Save to both Firebase and localStorage
  const saveParticipants = async (newParticipants) => {
    try {
      // Save to localStorage as fallback
      localStorage.setItem('choreChart_participants', JSON.stringify(newParticipants));

      // Save to Firebase if available
      await setDoc(participantsDocRef, { list: newParticipants });
      setLastSynced(new Date());
    } catch (error) {
      console.error("Error saving participants:", error);
    }
  };

  const saveChores = async (newChores) => {
    try {
      // Save to localStorage as fallback
      localStorage.setItem('choreChart_chores', JSON.stringify(newChores));

      // Save to Firebase
      await setDoc(choresDocRef, newChores);
      setLastSynced(new Date());
    } catch (error) {
      console.error("Error saving chores:", error);
    }
  };

  // Generate days for the current week
  const generateWeekDays = () => {
    const currentDate = new Date(selectedDay);
    const day = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Set to beginning of week (Sunday)
    currentDate.setDate(currentDate.getDate() - day);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);
      weekDays.push(date);
    }

    return weekDays;
  };

  const weekDays = generateWeekDays();

  // Format date as "Day Month Date" (e.g., "Mon. Feb 19")
  const formatDate = (date) => {
    return `${daysOfWeek[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Get short format for table header
  const getShortDate = (date) => {
    return `${daysOfWeek[date.getDay()]}`;
  };

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;

      recognition.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        setTranscript(transcript);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    } else {
      alert('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
    };
  }, []);

  // Toggle listening state
  const toggleListening = () => {
    if (selectedParticipant === null) {
      alert('Please select a participant first');
      return;
    }

    if (isListening) {
      recognition.current.stop();

      // Add the chore if transcript is not empty
      if (transcript.trim()) {
        addChore(selectedParticipant, formatDateKey(selectedDay), transcript);
        setTranscript('');
      }
    } else {
      setTranscript('');
      recognition.current.start();
    }

    setIsListening(!isListening);
  };

  // Format date as key for chores object: YYYY-MM-DD
  const formatDateKey = (date) => {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  };

  // Add new chore
  const addChore = (participant, dateKey, choreText) => {
    const newChores = { ...chores };

    if (!newChores[participant]) {
      newChores[participant] = {};
    }

    if (!newChores[participant][dateKey]) {
      newChores[participant][dateKey] = [];
    }

    newChores[participant][dateKey].push({
      id: Date.now(),
      text: choreText,
      completed: false,
      approved: false
    });

    setChores(newChores);
    saveChores(newChores);
  };

  // Add participant
  const addParticipant = () => {
    if (newParticipant.trim() !== '' && !participants.includes(newParticipant)) {
      const newParticipants = [...participants, newParticipant];
      setParticipants(newParticipants);
      saveParticipants(newParticipants);
      setNewParticipant('');
    }
  };

  // Remove participant
  const removeParticipant = (index) => {
    const newParticipants = [...participants];
    const removed = newParticipants.splice(index, 1)[0];

    setParticipants(newParticipants);
    saveParticipants(newParticipants);

    // Also remove their chores
    const newChores = { ...chores };
    delete newChores[removed];
    setChores(newChores);
    saveChores(newChores);

    // If selected participant is removed, deselect
    if (selectedParticipant === removed) {
      setSelectedParticipant(null);
    }
  };

  // Toggle chore completion
  const toggleChoreCompletion = (participant, dateKey, choreId) => {
    const newChores = { ...chores };

    const choreIndex = newChores[participant][dateKey].findIndex(
      chore => chore.id === choreId
    );

    if (choreIndex !== -1) {
      newChores[participant][dateKey][choreIndex].completed =
        !newChores[participant][dateKey][choreIndex].completed;

      // Reset approval when completion status changes
      newChores[participant][dateKey][choreIndex].approved = false;
    }

    setChores(newChores);
    saveChores(newChores);
  };

  // Toggle chore approval
  const toggleChoreApproval = (participant, dateKey, choreId) => {
    const newChores = { ...chores };

    const choreIndex = newChores[participant][dateKey].findIndex(
      chore => chore.id === choreId
    );

    if (choreIndex !== -1 && newChores[participant][dateKey][choreIndex].completed) {
      newChores[participant][dateKey][choreIndex].approved =
        !newChores[participant][dateKey][choreIndex].approved;
    }

    setChores(newChores);
    saveChores(newChores);
  };

  // Delete a chore
  const deleteChore = (participant, dateKey, choreId) => {
    const newChores = { ...chores };

    if (newChores[participant] && newChores[participant][dateKey]) {
      newChores[participant][dateKey] = newChores[participant][dateKey].filter(
        chore => chore.id !== choreId
      );
    }

    setChores(newChores);
    saveChores(newChores);
  };

  // Start editing a chore
  const startEditChore = (participant, dateKey, chore) => {
    setEditMode(true);
    setEditingChore({ participant, dateKey, id: chore.id });
    setEditText(chore.text);
  };

  // Save edited chore
  const saveEditedChore = () => {
    if (editingChore && editText.trim()) {
      const { participant, dateKey, id } = editingChore;

      const newChores = { ...chores };

      const choreIndex = newChores[participant][dateKey].findIndex(
        chore => chore.id === id
      );

      if (choreIndex !== -1) {
        newChores[participant][dateKey][choreIndex].text = editText;
      }

      setChores(newChores);
      saveChores(newChores);

      setEditMode(false);
      setEditingChore(null);
      setEditText('');
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditMode(false);
    setEditingChore(null);
    setEditText('');
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDay);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDay(newDate);
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const newDate = new Date(selectedDay);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDay(newDate);
  };

  // Force refresh data
  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Get participants
      const participantsDoc = await getDoc(participantsDocRef);
      if (participantsDoc.exists() && participantsDoc.data().list) {
        setParticipants(participantsDoc.data().list);
      }

      // Get chores
      const choresDoc = await getDoc(choresDocRef);
      if (choresDoc.exists()) {
        setChores(choresDoc.data());
      }

      setLastSynced(new Date());
    } catch (error) {
      console.error("Error refreshing data:", error);
      alert("Failed to refresh data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Render chores for a participant on a specific day
  const renderChores = (participant, date) => {
    const dateKey = formatDateKey(date);

    if (!chores[participant] || !chores[participant][dateKey]) {
      return null;
    }

    return (
      <div className="space-y-2">
        {chores[participant][dateKey].map(chore => (
          <div
            key={chore.id}
            className={`p-2 rounded-md text-sm ${
              chore.approved ? 'bg-green-100' :
              chore.completed ? 'bg-yellow-100' : 'bg-white'
            } border`}
          >
            {editMode && editingChore && editingChore.id === chore.id ? (
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="border p-1 text-sm w-full"
                  autoFocus
                />
                <div className="flex justify-end gap-1">
                  <button
                    onClick={saveEditedChore}
                    className="text-green-600 hover:text-green-800"
                  >
                    <Save size={14} />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-1">
                <span className={chore.completed ? 'line-through' : ''}>
                  {chore.text}
                </span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => toggleChoreCompletion(participant, dateKey, chore.id)}
                    className={`${chore.completed ? 'text-green-600' : 'text-gray-400'} hover:text-green-800`}
                    title={chore.completed ? "Mark as incomplete" : "Mark as complete"}
                  >
                    <Check size={16} />
                  </button>

                  {chore.completed && (
                    <button
                      onClick={() => toggleChoreApproval(participant, dateKey, chore.id)}
                      className={`${chore.approved ? 'text-blue-600' : 'text-gray-400'} hover:text-blue-800`}
                      title={chore.approved ? "Remove approval" : "Approve completion"}
                    >
                      <span className="font-bold text-xs">✓✓</span>
                    </button>
                  )}

                  <button
                    onClick={() => startEditChore(participant, dateKey, chore)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Edit chore"
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    onClick={() => deleteChore(participant, dateKey, chore.id)}
                    className="text-gray-400 hover:text-red-600"
                    title="Delete chore"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">Family Chores Chart</h1>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading chores data...</p>
        </div>
      ) : (
        <>
          {/* Sync status */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
              Connected to cloud
            </span>

            {lastSynced && (
              <span className="text-sm text-gray-500">
                Last synced: {lastSynced.toLocaleTimeString()}
              </span>
            )}

            <button
              onClick={refreshData}
              className="p-1 text-blue-500 hover:text-blue-700"
              disabled={isLoading}
              title="Refresh data"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Week navigation */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={goToPreviousWeek}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Previous Week
            </button>
            <span className="font-medium">
              Week of {months[weekDays[0].getMonth()]} {weekDays[0].getDate()} - {months[weekDays[6].getMonth()]} {weekDays[6].getDate()}, {weekDays[0].getFullYear()}
            </span>
            <button
              onClick={goToNextWeek}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Next Week
            </button>
          </div>

          {/* Participant management */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Manage Participants</h2>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                placeholder="Add new participant"
                className="border p-2 rounded flex-grow"
              />
              <button
                onClick={addParticipant}
                className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {participants.map((participant, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded"
                >
                  <span>{participant}</span>
                  <button
                    onClick={() => removeParticipant(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Voice input section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Voice Input</h2>
            <div className="flex items-center gap-4">
              <div className="flex-grow">
                <p className="mb-1 font-medium">Selected Participant:</p>
                <select
                  value={selectedParticipant || ''}
                  onChange={(e) => setSelectedParticipant(e.target.value || null)}
                  className="border p-2 rounded w-full"
                >
                  <option value="">Select a participant</option>
                  {participants.map((participant, index) => (
                    <option key={index} value={participant}>{participant}</option>
                  ))}
                </select>
              </div>

              <div className="flex-grow">
                <p className="mb-1 font-medium">Selected Day:</p>
                <select
                  value={formatDateKey(selectedDay)}
                  onChange={(e) => {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    setSelectedDay(new Date(year, month - 1, day));
                  }}
                  className="border p-2 rounded w-full"
                >
                  {weekDays.map((date, index) => (
                    <option key={index} value={formatDateKey(date)}>
                      {formatDate(date)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={toggleListening}
                className={`p-3 rounded-full ${
                  isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                } text-white`}
                title={isListening ? "Stop listening" : "Start listening"}
              >
                <Mic size={24} />
              </button>
            </div>

            {isListening && (
              <div className="mt-3 p-3 bg-white rounded border">
                <p className="font-medium">Listening...</p>
                <p className="italic">{transcript}</p>
              </div>
            )}
          </div>

          {/* Chores chart */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Person</th>
                  {weekDays.map((date, index) => (
                    <th key={index} className="border p-2 text-center">
                      {getShortDate(date)}
                      <div className="text-xs font-normal">
                        {months[date.getMonth()]} {date.getDate()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participants.map((participant, pIndex) => (
                  <tr key={pIndex} className={pIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="border p-2 font-medium">{participant}</td>
                    {weekDays.map((date, dIndex) => (
                      <td
                        key={dIndex}
                        className="border p-2 align-top"
                        onClick={() => {
                          setSelectedParticipant(participant);
                          setSelectedDay(date);
                        }}
                      >
                        {renderChores(participant, date)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p><span className="inline-block w-3 h-3 bg-white border mr-1"></span> Incomplete</p>
            <p><span className="inline-block w-3 h-3 bg-yellow-100 border mr-1"></span> Completed</p>
            <p><span className="inline-block w-3 h-3 bg-green-100 border mr-1"></span> Approved</p>
          </div>
        </>
      )}
    </div>
  );
};

export default ChoresChart;
