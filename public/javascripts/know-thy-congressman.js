KTC = {
  
  // Loader for loading up 'em scripts
  Loader : {
    
    // Get started by loading in the Google AJAX API, and JQuery...
    initialize : function() {
      this.urls = {
        stylesheet : KTC_ROOT + '/stylesheets/know-thy-congressman.css',
        jquery     : 'http://ajax.googleapis.com/ajax/libs/jquery/1.3.1/jquery.min.js',
        processing : KTC_ROOT + '/javascripts/processing-packed.js',
        templates  : KTC_ROOT + '/templates.js',
        politician : KTC.createTemplate(KTC_ROOT + '/find/<%= name %>.js?callback=<%= callback %>')
      };
      this.loadStylesheet(this.urls.stylesheet);
      this.loadJavascript(this.urls.jquery, function() { KTC.Politician.run(); });
      this.loadJavascript(this.urls.templates);
      this.loadJavascript(this.urls.processing);
    },
    
    // Get a reference to the document's head tag
    getHeadTag : function() {
      return document.getElementsByTagName('head')[0];
    },
    
    // Load a javascript by source.
    loadJavascript : function(location, callback) {
      var script = document.createElement('script');
      script.src = location;
      script.type = 'text/javascript';
      if (callback) script.onload = callback;
      this.getHeadTag().appendChild(script);
    },
    
    // Load a stylesheet by source.
    loadStylesheet : function(location, callback) {
      var sheet = document.createElement('link');
      sheet.rel = 'stylesheet';
      sheet.type = 'text/css';
      sheet.href = location;
      if (callback) sheet.onload = callback;
      this.getHeadTag().appendChild(sheet);
    }
  },
  
  
  // Base model for the selected politician.
  Politician : {
    
    // TODO: Remove the default
    DEFAULT_POLITICIAN : 'Clinton, Hillary',
    
    // Get started by searching for politician on the server
    run : function() {
      this.searchFor(this.getSelectedText());      
    },
    
    // Get the selected text from the document.
    getSelectedText : function() {
      var text = window.getSelection ? window.getSelection().toString() : 
                 document.getSelection ? document.getSelection().toString() :
                 document.selection ? document.selection.createRange().text : '';
      return text || this.DEFAULT_POLITICIAN;
    },
    
    // Get the JSON data from Know-Thy-Congressman for a given politician.
    searchFor : function(name) {
      var data = {name : this.mungeName(name), callback : 'KTC.Politician.loaded'};
      var url = KTC.Loader.urls.politician(data);
      $.ajax({url : url, dataType : 'script'});
    },
    
    // Convert a name to standard firstName_lastName form.
    mungeName : function(name) {
      if (name.match(/,/)) name = name.split(/,\s*/).reverse().join(' ');
      name = name.split(/\W/);
      return name[0] + '_' + name[name.length-1];
    },
    
    // After the politician's data has loaded, we can really get started.
    loaded : function(data) {
      data = window.eval("("+data+")");
      console.log(data);
      this.render(data);
    },
    
    // Render KTC for a given congressman's data.
    render : function(data) {
      if (this.element) this.element.remove();
      var html = KTC.templates.base(data);
      $('body').append(html);
      this.element = $('#ktc');
    }
    
  },
  
  
  // Templating adapted from http://ejohn.org/blog/javascript-micro-templating/
  createTemplate : function(st) {
    return new Function("obj",
      "var p=[], print=function(){p.push.apply(p, arguments);};" + 
      "with(obj){p.push('" +
      st.replace(/[\r\t\n]/g, " ")
        .split("<%").join("\t")
        .replace(/((^|%>)[^\t]*)'/g, "typeof($1) == 'undefined' ? '' : $1\r")
        .replace(/\t=(.*?)%>/g, "',typeof($1) == 'undefined' ? '' : $1,'")
        .split("\t").join("');")
        .split("%>").join("p.push('")
        .split("\r").join("\\'")
      + "');}return p.join('');");
  }
  
};


KTC.Loader.initialize();