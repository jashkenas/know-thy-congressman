KTC = {
  
  // Loader for loading up 'em scripts
  Loader : {
    
    // Get started by loading in the Google AJAX API, and JQuery...
    initialize : function() {
      
      this.urls = {
        stylesheet : KTC_ROOT + '/stylesheets/know-thy-congressman.css',
        jquery     : 'http://ajax.googleapis.com/ajax/libs/jquery/1.3.1/jquery.min.js',
        jqueryDrag : KTC_ROOT + '/javascripts/packed/jquery_draggable.js',
        processing : KTC_ROOT + '/javascripts/packed/processing.js',
        typeface   : KTC_ROOT + '/javascripts/typeface.js',
        numbers    : KTC_ROOT + '/javascripts/numbers.js',
        templates  : KTC_ROOT + '/templates.js',
        politician : KTC.Util.createTemplate(KTC_ROOT + '/find/<%= name %>.js?callback=<%= callback %>')
      };
      
      this.fonts = {
        whitneyBook    : KTC_ROOT + '/javascripts/type/whitney-book_regular.typeface.js', 
        whitneyLightSC : KTC_ROOT + '/javascripts/type/whitney-light_sc_regular.typeface.js',
        whitneyLight   : KTC_ROOT + '/javascripts/type/whitney-light_regular.typeface.js',
        whitneyBold    : KTC_ROOT + '/javascripts/type/whitney-bold_regular.typeface.js',
        whitneyMed     : KTC_ROOT + '/javascripts/type/whitney-medium_regular.typeface.js',
        whitneyMedSC   : KTC_ROOT + '/javascripts/type/whitney-medium_sc_regular.typeface.js',
        politicaXT     : KTC_ROOT + '/javascripts/type/politica_xt_regular.typeface.js'
      };
      
      this.loadStylesheet(this.urls.stylesheet);
      this.loadJavascript(this.urls.jquery, function() {
        KTC.Loader.loadJavascript(KTC.Loader.urls.jqueryDrag);
        KTC.Politician.run(); 
      });
      this.loadJavascript(this.urls.numbers);
      this.loadJavascript(this.urls.templates);
      this.loadJavascript(this.urls.typeface);
      this.loadJavascript(this.fonts.whitneyMediumSC);
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
    
    INFO_TO_DISPLAY : [
      ['requested_earmarks',  'Earmarks Requested',            'third'],
      ['received_earmarks',   'Earmarks Received',             'third'],
      ['birthplace',          'Birthplace',                    'big'],
      ['the_birthday',        'Birthday',                      'third'],
      ['n_bills_cosponsored', 'Number of Bills Co-Sponsored',  'xbig third'],
      ['n_bills_introduced',  'Number of Bills Introduced',    'xbig third'],
      ['n_bills_enacted',     'Number of Bills Enacted',       'xbig third']
      
    ],
    
    MONTH_MAP : {
      '01' : 'Jan', '02' : 'Feb', '03' : 'Mar', '04' : 'Apr', '05' : 'May', '06' : 'Jun', 
      '07' : 'Jul', '08' : 'Aug', '09' : 'Sep', '10' : 'Oct', '11' : 'Nov', '12' : 'Dec'
    },
    
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
    
    // Go through the data object, munging what we need to for display.
    mungeData : function(data) {
      data.name = data.firstname + " " + data.lastname;
      data.requested_earmarks = KTC.Util.friendlyMoney(data.amt_earmark_requested);
      data.received_earmarks = KTC.Util.friendlyMoney(data.amt_earmark_received);
      data.birthplace = data.birthplace || 'unknown';
      data.the_birthday = this.mungeDate(data.birthday);
      return data;
    },
    
    // Convert a computer-ish date to a "Oct 10, 1976"-style one.
    mungeDate : function(date) {
      if (!date) return '--';
      var parts = date.split('-');
      var year = parts[0]; var month = parts[1]; var day = parts[2];
      return this.MONTH_MAP[month] + " " + day + ", " + year;
    },
    
    // Convert a name to standard firstName_lastName form.
    mungeName : function(name) {
      if (name.match(/,/)) name = name.split(/,\s*/).reverse().join(' ');
      name = name.split(/\W/);
      return name[0] + '_' + name[name.length-1];
    },
    
    // After the politician's data has loaded, we can really get started.
    // Munge the data as needed.
    loaded : function(data) {
      data = window.eval("("+data+")");
      data = this.mungeData(data);
      if (console.log) console.log(data);
      this.render(data);
      KTC.typefaceInit();
      $('#ktc').draggable();
    },
    
    // Render KTC for a given congressman's data.
    render : function(data) {
      if (this.element) this.element.remove();
      var html = KTC.templates.base(data);
      $('body').append(html);
      this.element = $('#ktc');
      $.each(this.INFO_TO_DISPLAY, function(){ KTC.Politician.renderBlock(this, data); });
    },
    
    // Render a single datum in a block.
    renderBlock : function(meta, data) {
      var params = {key : meta[0], label : meta[1], klass : meta[2], content : data[meta[0]]};
      var html = KTC.templates.block(params);
      this.element.find('.blocks').append(html);
    }
    
  },
  
  
  // Utility functions
  Util : {
   
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
    },
    
    // Parse dollars at politician scale into something a little less staggering.
    friendlyMoney : function(dollars) {
      if (!dollars) return '--';
      var scale = (dollars > 1000000) ? ['mil', '0,0,, '] : ['grand', '0,0, '];            
      var money = dollars.numberFormat(scale[1]) + scale[0];
      return "$" + money.replace(/^0/, '');
    }
    
  }
  
};


KTC.Loader.initialize();