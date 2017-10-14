function save_options() {
  var color = document.getElementById('color').checked;
  var deletepage = document.getElementById('like').checked;
  chrome.storage.sync.set({
    savepage: color,
    deletepage: deletepage
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and deletepage = true.
  chrome.storage.sync.get({
    savepage: 'red',
    deletepage: true
  }, function(items) {
    document.getElementById('color').checked = items.savepage;
    document.getElementById('like').checked = items.deletepage;
    console.log(items.savepage);
    console.log(items.deletepage);
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);