KTC = {
  
  // Loader for loading up 'em scripts
  Loader : {
    
    // Libraries to be loaded:
    JQUERY     : 'http://ajax.googleapis.com/ajax/libs/jquery/1.3.1/jquery.min.js',
    PROCESSING : KTC_ROOT + '/javascripts/processing-packed.js',
    
    // Get started by loading in the Google AJAX API, and JQuery...
    initialize : function() {
      this.loadJavascript(this.JQUERY, function() { KTC.Politician.initialize(); });
      this.loadJavascript(this.PROCESSING);
    },
    
    // Load a given javascript, referenced by a given source.
    loadJavascript : function(location, callback) {
      var script = document.createElement('script');
      script.src = location;
      if (callback) script.onload = callback;
      document.getElementsByTagName('head')[0].appendChild(script);
    }
  },
  
  
  // Base model for the selected politician.
  Politician : {
    
    // Get started by searching for politician on the server
    initialize : function() {
      
    }
    
  },
  
  
  
  BASE_URL : 'http://localhost:3000/find/',
  
  initialize : function() {
    this.jsonpRequest(this.BASE_URL + first + '_' + last);
  },
  
  getSelection : function() {
    window.getSelection ? window.getSelection().toString() :
                          document.getSelection().toString();
  },
  
  loadCongressman : function(json) {
    alert(json);
  }
  
};


KTC.Loader.initialize();