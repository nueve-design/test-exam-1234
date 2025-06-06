let storyData;
let currentNode;
let currentStoryIndex = 1;
let selectedStory = '';
let continuingToNextFile = false;

// Get story parameter from URL
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Add event listener for clicking on the game container
document.addEventListener('DOMContentLoaded', function() {
    const gameContainer = document.querySelector('.game-container');
    gameContainer.addEventListener('click', function(event) {
        // Only trigger nextNode if we're on a narrative node and not clicking on a choice button
        if (currentNode && currentNode.type === 'narrative' && 
            !event.target.classList.contains('choice-button')) {
            nextNode();
        }
    });
    
    // Get the selected story from URL parameter
    selectedStory = getUrlParameter('story');
    if (!selectedStory) {
        selectedStory = 'story'; // Default to 'story' if no parameter
    }
    
    // Load first story file
    loadStory(currentStoryIndex);
});

// Load story data from file
function loadStory(index) {
    const storyPath = `data/${selectedStory}-${index}.json`;
    console.log(`Loading story file: ${storyPath}`);
    
    fetch(storyPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Story file not found: ${storyPath}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Successfully loaded: ${storyPath}`);
            storyData = data;
            
            // If we're continuing from previous file, start from the first node
            // Otherwise, if reloading same file (e.g. after a choice), keep current node
            if (!currentNode || continuingToNextFile) {
                if (storyData.nodes && storyData.nodes.length > 0) {
                    currentNode = storyData.nodes[0];
                    continuingToNextFile = false;
                    console.log(`Set current node to first node: ${currentNode.id}`);
                } else {
                    console.error(`Story file has no nodes: ${storyPath}`);
                    alert('Błąd: Historia nie zawiera węzłów');
                    window.location.href = 'index.html';
                    return;
                }
            }
            
            displayNode(currentNode);
        })
        .catch(error => {
            console.error(`Error loading data: ${error.message}`);
            if (index > 1) {
                // If we've reached the end of the story files, go back to the start screen
                alert('Historia się zakończyła. Powrót do strony głównej.');
                window.location.href = 'index.html';
            } else {
                document.getElementById('narration').textContent = 'Błąd podczas ładowania historii.';
            }
        });
}

// Check if next story file exists
function checkNextStoryFile() {
    const nextIndex = currentStoryIndex + 1;
    const nextStoryPath = `data/${selectedStory}-${nextIndex}.json`;
    console.log(`Checking if next story file exists: ${nextStoryPath}`);
    
    return fetch(nextStoryPath)
        .then(response => {
            const exists = response.ok;
            console.log(`Next story file ${exists ? 'exists' : 'does not exist'}: ${nextStoryPath}`);
            return exists;
        })
        .catch(error => {
            console.error(`Error checking next story file: ${error.message}`);
            return false;
        });
}

// Wyświetl aktualny węzeł
function displayNode(node) {
    if (!node) {
        console.error('Cannot display undefined node');
        return;
    }
    
    const narrationElement = document.getElementById('narration');
    if (node.text) {
        narrationElement.textContent = node.text;
    } else {
        console.error(`Node ${node.id} has no text property`);
        narrationElement.textContent = 'Błąd: Brak tekstu w węźle';
    }
    
    // Update character emotion image
    updateEmotionImage(node.emotion);
    
    const choiceButtons = [
        document.getElementById('choice1'),
        document.getElementById('choice2'),
        document.getElementById('choice3'),
        document.getElementById('choice4')
    ];
    
    // Resetuj wszystkie przyciski
    choiceButtons.forEach(button => {
        if (button) {
            button.style.display = 'none';
            button.disabled = true;
            button.textContent = '';
        }
    });
    
    // Jeśli to węzeł wyboru, pokaż opcje
    if (node.type === 'choice') {
        if (node.options && node.options.length > 0) {
            node.options.forEach((option, index) => {
                if (index < choiceButtons.length && choiceButtons[index]) {
                    choiceButtons[index].textContent = option.text;
                    choiceButtons[index].style.display = 'block';
                    choiceButtons[index].disabled = false;
                }
            });
        } else {
            console.error(`Choice node ${node.id} has no options`);
        }
        
        // Pokaż kontener z przyciskami wyboru
        const buttonsContainer = document.querySelector('.buttons-container');
        if (buttonsContainer) {
            buttonsContainer.style.display = 'block';
        }
    } else {
        // Ukryj kontener z przyciskami wyboru
        const buttonsContainer = document.querySelector('.buttons-container');
        if (buttonsContainer) {
            buttonsContainer.style.display = 'none';
        }
    }
}

// Update the character emotion image
function updateEmotionImage(emotion) {
    const sceneImage = document.getElementById('scene-image');
    if (!sceneImage) {
        console.error('Scene image element not found');
        return;
    }
    
    // Default to smile if no emotion is specified
    if (!emotion) {
        emotion = 'smile';
    }
    
    // Map emotion to image file
    let imagePath;
    switch(emotion) {
        case 'smile':
            imagePath = 'img/smile.png';
            break;
        case 'shock':
            imagePath = 'img/shock.png';
            break;
        case 'angry':
            imagePath = 'img/angry.png';
            break;
        default:
            console.warn(`Unknown emotion: ${emotion}, defaulting to smile`);
            imagePath = 'img/smile.png';
            break;
    }
    
    // Update image source
    sceneImage.src = imagePath;
}

// Przejdź do następnego węzła
function nextNode() {
    if (!currentNode) {
        console.error('Cannot navigate from undefined node');
        return;
    }
    
    if (currentNode.nextNodeId) {
        // Find the next node in the current story data
        const nextNode = storyData.nodes.find(node => node.id === currentNode.nextNodeId);
        if (nextNode) {
            currentNode = nextNode;
            displayNode(currentNode);
        } else {
            console.error(`Could not find node with ID: ${currentNode.nextNodeId}`);
            // Try to load the next story file as a fallback
            tryLoadNextStoryFile();
        }
    } else {
        // If there's no next node, try to load the next story file
        tryLoadNextStoryFile();
    }
}

// Try to load the next story file
function tryLoadNextStoryFile() {
    checkNextStoryFile().then(exists => {
        if (exists) {
            // Next story file exists, load it
            currentStoryIndex++;
            continuingToNextFile = true;
            loadStory(currentStoryIndex);
        } else {
            // No more story files, go back to index
            alert('Historia się zakończyła. Powrót do strony głównej.');
            window.location.href = 'index.html';
        }
    });
}

// Obsługa wyboru opcji
function makeChoice(optionIndex) {
    if (!currentNode) {
        console.error('Cannot make choice from undefined node');
        return;
    }
    
    if (currentNode.type === 'choice' && 
        currentNode.options && 
        optionIndex >= 0 && 
        optionIndex < currentNode.options.length) {
        
        const targetNodeId = currentNode.options[optionIndex].targetNodeId;
        if (!targetNodeId) {
            console.error(`Option ${optionIndex} has no targetNodeId`);
            return;
        }
        
        const targetNode = storyData.nodes.find(node => node.id === targetNodeId);
        
        if (targetNode) {
            currentNode = targetNode;
            displayNode(currentNode);
        } else {
            console.error(`Could not find node with ID: ${targetNodeId}`);
            // Try to load the next story file as a fallback
            tryLoadNextStoryFile();
        }
    } else {
        console.error(`Invalid choice: node type=${currentNode.type}, optionIndex=${optionIndex}`);
    }
} 