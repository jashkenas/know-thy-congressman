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
        politicaXT        : KTC_ROOT + '/type/politica_xt_regular.typeface.js',
        politicaXTBoldIT  : KTC_ROOT + '/type/politica_xt_bold_italic.typeface.js'
      };
      
      this.loadStylesheet(this.urls.stylesheet);
      this.loadJavascript(this.urls.jquery, function() {
        KTC.Loader.loadJavascript(KTC.Loader.urls.jqueryDrag);
        KTC.Politician.run(); 
      });
      this.loadJavascript(this.urls.numbers);
      this.loadJavascript(this.urls.templates);
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
      ['requested_earmarks',  'Earmarks Requested',           ''],
      ['received_earmarks',   'Earmarks Received',            ''],
      ['maverickometer',      "Maverick-O-Meter",             ''],
      ['born',                'Born',                         'double'],
      ['speeches',            'Average Words per Speech',     ''],
      ['education',           'Education',                    'xsmall triple open'],
      ['n_bills_cosponsored', 'Bills Co-Sponsored',           'short xbig thin'],
      ['n_bills_introduced',  'Bills Introduced',             'short xbig thin'],
      ['n_bills_debated',     'Bills Debated',                'short xbig thin'],
      ['n_bills_enacted',     'Bills Enacted',                'short xbig'],
      ['photographs',         'Photographs',                  'triple'],
      ['industry_support',    'Top 5 Groups',                 'half table'],
      ['institution_support', 'Top 5 Institutions',           'half table']
    ],
    
    CANVASES_TO_DRAW : [
      { 
        before : 'n_bills_cosponsored', 
        id : 'ktc_bills_canvas',
        klass : 'xbig triple',
        width: 754, height: 110,
        data : ['n_bills_cosponsored', 'n_bills_introduced', 
                'n_bills_debated', 'n_bills_enacted']
      },
      {
        before : 'requested_earmarks',
        width: 500, height: 75,
        klass : 'xbig triple',
        id : 'ktc_earmarks_canvas',
        data : ['amt_earmark_requested', 'amt_earmark_received']
      }
    ],
    
    PARTY_COLORS : {
      'Republican' : '#f58980', 
      'Democrat'   : '#00e9f5', 
      'Other'      : '#f5e900'
    },
    
    MONTH_MAP : {
      '01' : 'Jan', '02' : 'Feb', '03' : 'Mar', '04' : 'Apr', '05' : 'May', '06' : 'Jun', 
      '07' : 'Jul', '08' : 'Aug', '09' : 'Sep', '10' : 'Oct', '11' : 'Nov', '12' : 'Dec'
    },
    
    KIND_OF_CONGRESSMAN_MAP : {
      'Sen' : 'Senator', 
      'Rep' : 'Representative', 
      'Del' : 'Delegate'
    },
    
    TOP_N_CONTRIBUTORS : 5,
    
    UNKNOWN : '--',
    
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
      data.party_affiliation = (data.party == "Democrat") ? "Democratic" : data.party;
      data.kind_of_congressman = this.KIND_OF_CONGRESSMAN_MAP[data.title];
      data.name = data.firstname + " " + data.lastname;
      data.requested_earmarks = KTC.Util.friendlyMoney(data.amt_earmark_requested);
      data.received_earmarks = this.mungeReceivedEarmarks(data);
      data.born = (KTC.Util.truncate(data.birthplace, 20) || this.UNKNOWN) + ' <small>(' + this.mungeDate(data.birthday) + ")</span>";
      data.education = this.mungeEducation(data.education);
      data.maverickometer = data.predictability ? ((1 - data.predictability) * 100).numberFormat("0.0") + '%' : this.UNKNOWN;
      data.speeches = data.words_per_speech ? data.words_per_speech + " <small>(spoke " + data.n_speeches + " times)</small>" : this.UNKNOWN;
      data.industry_support = this.mungeTable(data, 'opensecrets_industries');
      data.institution_support = this.mungeTable(data, 'opensecrets_contributors');
      return data;
    },
    
    // Create a campaign contribution table from the given data source
    mungeTable : function(data, key) {
      var result = "";
      if (!data[key]) return;
      for (var i=0; i<this.TOP_N_CONTRIBUTORS; i++) {
        var el = data[key][i];
        var name = el.org_name || el.industry_name;
        var total = KTC.Util.friendlyMoney(el.total);
        result += KTC.templates.row({name : name, total : total});
      }
      return result;
    },
    
    // Get a properly-formatted education out of the data.
    // Remove honorary degrees (what do they really count for anyway? ...)
    mungeEducation : function(edu) {
      if (!edu) return this.UNKNOWN;
      var degrees = [];
      $.each(edu.replace(/\.$/, '').split(/\W*\n\W*/), function() {
        if (!this.match(/honorary/i)) degrees.push(this);
      });
      return degrees.join("<br />");
    },
    
    // Make a fault-tolerant received earmarks.
    mungeReceivedEarmarks : function(data) {
      var ending = data.n_earmark_received ? 
          " <small>(" + data.n_earmark_received + " of " + data.n_earmark_requested + ")</small>" : 
          "";
      return KTC.Util.friendlyMoney(data.amt_earmark_received) + ending;
    },
    
    // Convert a computer-ish date to a "Oct 10, 1976"-style one.
    mungeDate : function(date) {
      if (!date) return this.UNKNOWN;
      var parts = date.split('-');
      var year = parts[0]; var month = parts[1]; var day = parts[2];
      return this.MONTH_MAP[month] + " " + day + ", " + year;
    },
    
    // Convert a name to standard firstName_lastName form.
    mungeName : function(name) {
      if (name.match(/,/)) name = name.split(/,\s*/).reverse().join(' ');
      name = name.replace(/(^\W*|\W*$)/g, '').split(/\W/);
      return name[0] + '_' + name[name.length-1];
    },
    
    // After the politician's data has loaded, we can really get started.
    // Munge the data as needed.
    loaded : function(data) {
      data = window.eval("("+data+")");
      data = this.mungeData(data);
      if (console && console.log) console.log(data);
      this.render(data);
      $('#ktc').draggable();
    },
    
    // Render KTC for a given congressman's data.
    render : function(data) {
      if (this.element) this.element.remove();
      var html = KTC.templates.base(data);
      $('body').append(html);
      this.element = $('#ktc');
      $.each(this.INFO_TO_DISPLAY, function(){ KTC.Politician.renderBlock(this, data); });
      $.each(this.CANVASES_TO_DRAW, function(){ KTC.Grapher.visualize(this, data); });
      this.renderPhotographs(data);
    },
    
    // Render the Flickr photos from the data.
    renderPhotographs : function(data) {
      for (var i=0; i<9; i++) {
        var photo = data.flickr[i];
        if (!photo) return;
        var html = KTC.templates.photograph(photo);
        KTC.Politician.element.find('.photographs .answer').append(html);
      }
    },
    
    // Render a single datum in a block.
    renderBlock : function(meta, data) {
      var params = {key : meta[0], label : meta[1], klass : meta[2], content : data[meta[0]]};
      var html = KTC.templates.block(params);
      this.element.find('.blocks').append(html);
    }
    
  },
  
  
  // Graphing functions, for working with Canvases
  Grapher : {
    
    CURVE_FACTOR : 0.5,
        
    // Visualize the data provided according to the meta.
    visualize : function(meta, data) {
      var firstBlock = $('#ktc .block');
      var toPrecede = $('#ktc .block.' + meta.before);
      toPrecede.before(KTC.templates.canvas(meta));
      // It's absolutely positioned, so we gotta stick it in the right place.
      var canvas = $('#' + meta.id);
      var top = toPrecede.offset().top - firstBlock.offset().top;
      var left = toPrecede.offset().left - firstBlock.offset().left;
      canvas.css({'margin-top' : top + 3, 'margin-left' : left});
      canvas = canvas.find('canvas');
      var width = meta.width; var height = meta.height;
      var p = canvas.get()[0].getContext('2d');
      var colors = KTC.Politician.PARTY_COLORS;
      p.fillStyle = colors[data.party] || colors['Other'];
      p.strokeWidth = 0;
            
      var nums = $.map(meta.data, function(name){ return data[name]; });
      var scale = height / KTC.Util.arrayMax(nums);
      var segment = width / (nums.length - 1);
      var div = segment * (1 - this.CURVE_FACTOR);
      var prev_x = 0; var prev_y = 0;
      p.beginPath();
      p.moveTo(0, height);
      $.each(nums, function(i, num) {
        var x = segment * i;
        var y = height - num * scale;
        if (i == 0) p.lineTo(x, y);
        if (i != 0) p.bezierCurveTo(x - div, prev_y, prev_x + div, y, x, y);
        if (i == nums.length - 1) p.lineTo(x, y);
        prev_x = x; prev_y = y;
      });
      p.lineTo(width, height);
      p.lineTo(0, height);
      p.fill();
    }
    
  },
  
  
  // Utility functions
  Util : {
    
    // Get the maximum number from an array
    arrayMax : function(arr) {
      return arr.sort(function(a,b){ return b - a; })[0];
    },
    
    // Truncate a string, appending ellipsis.
    truncate : function(string, length) {
      if (!string) return null;
      var ending = (string.length > length) ? '&hellip;' : '';
      return string.substr(0, length-1) + ending;
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
    },
    
    // Parse dollars at politician scale into something a little less staggering.
    friendlyMoney : function(dollars) {
      if (!dollars) return KTC.Politician.UNKNOWN;
      var scale = (dollars > 1000000) ? ['mil', '0,0,, '] : ['grand', '0,0, '];            
      var money = parseInt(dollars, 10).numberFormat(scale[1]) + scale[0];
      return "$" + money.replace(/^0/, '');
    }
    
  }
  
};

KTC.Loader.initialize();