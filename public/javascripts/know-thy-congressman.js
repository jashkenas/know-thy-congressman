KTC = {
  
  // Loader for loading up 'em scripts
  Loader : {
    
    // The key code of the return key is 13...
    RETURN_KEY : 13,
    
    // Get started by loading in the Google AJAX API, and JQuery...
    initialize : function() {
      
      this.urls = {
        stylesheet : KTC_ROOT + '/stylesheets/know-thy-congressman.css',
        iestyles   : KTC_ROOT + '/stylesheets/iestyles.css',
        jquery     : KTC_ROOT + '/javascripts/packed/jquery.js',
        jqueryDrag : KTC_ROOT + '/javascripts/packed/jquery_draggable.js',
        excanvas   : KTC_ROOT + '/javascripts/packed/excanvas.js',
        numbers    : KTC_ROOT + '/javascripts/numbers.js',
        templates  : KTC_ROOT + '/templates.js',
        politician : KTC.Util.createTemplate(KTC_ROOT + '/find/<%= name %>.js?callback=<%= callback %>')
      };    
      
      var loaderFunction = function() {
        KTC.Loader.loaded = true;
        KTC.Loader.showSearch(KTC.Politician.getSelectedText());
      };
      
      var runnerFunction = function() {
        // In some circumstances (I'm looking at you, Safari), not even the templates 
        // will have loaded by this point, and we need to wait for them.
        if (!KTC.Loader.loaded) return setTimeout(runnerFunction, 50);
        KTC.Loader.attachLiveFunctions();
        KTC.Loader.loadJavascript(KTC.Loader.urls.jqueryDrag, function() {
          $J('#ktc').draggable();
        });
        KTC.Politician.run();
      };
      
      this.loadJavascript(this.urls.templates, loaderFunction);
      this.loadStylesheet(this.urls.stylesheet);
      this.loadJavascript(this.urls.jquery, function() {
        $J = window.jQuery.noConflict();
        if ($J.browser.msie) {
          KTC.Loader.loadStylesheet(KTC.Loader.urls.iestyles);
          KTC.Loader.loadJavascript(KTC.Loader.urls.excanvas, runnerFunction);
        } else {
          runnerFunction();
        }
      });
      this.loadJavascript(this.urls.numbers);
    },
    
    
    // Show the loading spinner, while we go and fetch the data...
    // No javascript libraries or anything will have loaded by this point.
    showSearch : function(text) {
      var ktc = document.getElementById('ktc');
      if (ktc) ktc.parentNode.removeChild(ktc);
      text = KTC.Politician.searchText = text || KTC.Politician.searchText;
      var className = text ? 'searching' : 'asking';
      var html = KTC.templates.searcher({text : text, className : className});
      document.body.innerHTML += html;
      ktc = document.getElementById('ktc');
      ktc.style.display = 'block';
      KTC.Util.alignElement(ktc);
      if (window['$J'] && $J(ktc).draggable) $J(ktc).draggable();
      if (!text) document.getElementById('ktc_search_input').focus();
      // If we're on a page that's rendering in IE Quirks mode, fix it.
      if (window['$J'] && $J.browser.msie && document.compatMode == 'BackCompat') {
        $J('#ktc .search_inner').css({width : '300px'});
      }
    },
    
    
    // Show an error message (like when we can't find a politician...)
    showError : function(data) {
      var ktc = $J('#ktc');
      ktc.removeClass('searching');
      ktc.addClass('erroring');
      ktc.find('.search_error').html(data.error);
    },
    
    
    // Attach all the "live" functions that we want hooked up to the UI.
    attachLiveFunctions : function() {
      $J('#ktc_search_button').live('click', KTC.Politician.run);
      $J('#ktc .closer').live('click', function() { 
        $J.browser.msie ? $J('#ktc').hide() : $J('#ktc').fadeOut(); 
      });
      $J('#ktc_search_input').live('keypress', function(e) {
        if (e.which == KTC.Loader.RETURN_KEY) KTC.Politician.run();
      });
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
      if (callback) this.setCallbackForResourceLoad(script, callback);
      this.getHeadTag().appendChild(script);
    },
    
    
    // Load a stylesheet by source.
    loadStylesheet : function(location, callback) {
      var sheet = document.createElement('link');
      sheet.rel = 'stylesheet';
      sheet.type = 'text/css';
      sheet.href = location;
      if (callback) this.setCallbackForResourceLoad(sheet, callback);
      this.getHeadTag().appendChild(sheet);
    },
    
    
    // Cross-browser set a callback for when a script tag is finished loading.
    setCallbackForResourceLoad : function(tag, callback) {
      tag.onload = callback;
      tag.onreadystatechange = function() {
        var state = tag.readyState;
        if (state == 'complete' || state == 'loaded') {
          tag.onreadystatechange = null;
          window.setTimeout(callback, 10);
        }
      };
    }
  },
  
  
  // Base model for the selected politician.
  Politician : {
    
    // Map all the info we'd like to display...
    // Data key,              Label,                            Style,                Linked?
    INFO_TO_DISPLAY : [
      ['n_bills_cosponsored', 'Bills Co-Sponsored',               'short xbig thin',    true],
      ['n_bills_introduced',  'Bills Introduced',                 'short xbig thin',    true],
      ['n_bills_debated',     'Bills Debated',                    'short xbig thin',    true],
      ['n_bills_enacted',     'Bills Enacted',                    'short xbig thin',    true],
      ['born',                'Born',                             'double'                  ],
      ['speeches',            'Average Words per Speech',         ''                        ],
      ['requested_earmarks',  'Earmarks Requested',               '',                   true],
      ['received_earmarks',   'Earmarks Received',                ''                        ],
      ['maverickometer',      "Maverick-O-Meter",                 ''                        ],
      ['education',           'Education',                        'xsmall triple open'      ],
      ['words',               'Most Used Words',                  'triple xbig'             ],      
      ['tubes',               '&#8216;Tubes',                     'half list'               ],
      ['industry_support',    'Top 10 Contributing Groups',       'half table list'         ],
      ['tweets',              'Tweets',                           'half list'               ],
      ['institution_support', 'Top 10 Contributing Institutions', 'half table list'         ],
      ['photographs',         'Photographs',                      'triple'                  ],
      ['articles',            'Recent NYTimes Articles',          'triple open'             ]
    ],
    
    GRAPHS_TO_DRAW : [
      { 
        before : 'n_bills_cosponsored', 
        id : 'ktc_bills_canvas',
        klass : 'xbig triple',
        width: 755, height: 75,
        data : ['n_bills_cosponsored', 'n_bills_introduced', 
                'n_bills_debated', 'n_bills_enacted']
      },
      {
        before : 'requested_earmarks',
        width: 500, height: 65,
        klass : 'xbig triple',
        id : 'ktc_earmarks_canvas',
        data : ['amt_earmark_requested', 'amt_earmark_received']
      },
      {
        before : 'words',
        width  : 755, height: 75,
        id : 'ktc_words_canvas',
        data : ['word_1', 'word_2', 'word_3', 'word_4', 'word_5']
      }
    ],
    
    PARTY_COLORS : {
      'R' : '#f58980', 
      'D' : '#00e9f5', 
      'I' : '#80d68a'
    },
    
    MONTH_MAP : {
      1 : 'Jan', 2 : 'Feb', 3 : 'Mar',  4 : 'Apr',  5 : 'May', 6  : 'Jun', 
      7 : 'Jul', 8 : 'Aug', 9 : 'Sep', 10 : 'Oct', 11 : 'Nov', 12 : 'Dec'
    },
    
    STATE_MAP : {
      'AL' : 'ALABAMA', 'AK' : 'ALASKA', 'AS' : 'AMERICAN SAMOA',
      'AZ' : 'ARIZONA', 'AR' : 'ARKANSAS', 'CA' : 'CALIFORNIA',
      'CO' : 'COLORADO', 'CT' : 'CONNECTICUT', 'DE' : 'DELAWARE',
      'DC' : 'DISTRICT OF COLUMBIA', 'FM' : 'FEDERATED STATES OF MICRONESIA',
      'FL' : 'FLORIDA', 'GA' : 'GEORGIA', 'GU' : 'GUAM', 'HI' : 'HAWAII',
      'ID' : 'IDAHO', 'IL' : 'ILLINOIS', 'IN' : 'INDIANA', 'IA' : 'IOWA',
      'KS' : 'KANSAS', 'KY' : 'KENTUCKY', 'LA' : 'LOUISIANA', 'ME' : 'MAINE',
      'MH' : 'MARSHALL ISLANDS', 'MD' : 'MARYLAND', 'MA' : 'MASSACHUSETTS',
      'MI' : 'MICHIGAN', 'MN' : 'MINNESOTA', 'MS' : 'MISSISSIPPI',
      'MO' : 'MISSOURI', 'MT' : 'MONTANA', 'NE' : 'NEBRASKA', 'NV' : 'NEVADA',
      'NH' : 'NEW HAMPSHIRE', 'NJ' : 'NEW JERSEY', 'NM' : 'NEW MEXICO',
      'NY' : 'NEW YORK', 'NC' : 'NORTH CAROLINA', 'ND' : 'NORTH DAKOTA',
      'MP' : 'NORTHERN MARIANA ISLANDS', 'OH' : 'OHIO', 'OK' : 'OKLAHOMA',
      'OR' : 'OREGON', 'PW' : 'PALAU', 'PA' : 'PENNSYLVANIA',
      'PR' : 'PUERTO RICO', 'RI' : 'RHODE ISLAND', 'SC' : 'SOUTH CAROLINA',
      'SD' : 'SOUTH DAKOTA', 'TN' : 'TENNESSEE', 'TX' : 'TEXAS', 'UT' : 'UTAH',
      'VT' : 'VERMONT', 'VI' : 'VIRGIN ISLANDS', 'VA' : 'VIRGINIA',
      'WA' : 'WASHINGTON', 'WV' : 'WEST VIRGINIA', 'WI' : 'WISCONSIN', 
      'WY' : 'WYOMING'
    },
    
    KIND_OF_CONGRESSMAN_MAP : {
      'Sen' : 'Senator', 
      'Rep' : 'Representative', 
      'Del' : 'Delegate'
    },
    
    PARTY_MAP : [
      [(/Democrat/i), "Democratic"],
      [(/Republican/i), "Republican"],
      [(/Independent/i), "Independent"]      
    ],
    
    CONTACT_INFO : ['email', 'phone', 'webform', 'wikipedia', 'congresspedia_url', 'website'],
    
    TOP_N_CONTRIBUTORS : 10,
    TOP_N_ARTICLES     : 5,
    
    UNKNOWN : '--',
    
    BACKGROUND_URL : KTC_ROOT + '/images/backer.png',
    
    YOUTUBE_URL : 'http://gdata.youtube.com/feeds/api/videos/-/News%7Cnews?orderby=relevance&max-results=4&v=2&alt=json-in-script&callback=?&q=',
    
    TWITTER_URL : 'http://search.twitter.com/search.json?callback=?&rpp=4&phrase=',
        
    
    // Get started by searching for politician on the server
    run : function() {
      var text = KTC.Politician.searchText || KTC.Politician.getSelectedText();
      KTC.Loader.showSearch(text);
      if (text) KTC.Politician.searchFor(text);
      KTC.Politician.searchText = null;    
    },
    
    
    // Get the selected text from the document. Should work before JQuery loads.
    // If a KTC_SEARCH is specified on the page, and there is no selected text
    // then it takes precedence.
    getSelectedText : function() {
      var input = document.getElementById('ktc_search_input');
      var text = input && input.value ? input.value : '';
      if (!text) text = window.getSelection ? window.getSelection().toString() : 
                        document.getSelection ? document.getSelection().toString() :
                        document.selection ? document.selection.createRange().text : '';
      if (!text && window.KTC_SEARCH) text = window.KTC_SEARCH;
      return text;
    },
    
    
    // Get the JSON data from Know-Thy-Congressman for a given politician.
    searchFor : function(name) {
      var data = {name : this.mungeName(name), callback : 'KTC.Politician.loaded'};
      var url = KTC.Loader.urls.politician(data);
      $J.ajax({url : url, dataType : 'script'});
      this.recordSearch();
    },
    
    
    // Hackety analytics code from Remy Sharp. Ping Google Analytics...
    recordSearch : function() {    
      var rand = function(min, max) {
        return min + Math.floor(Math.random() * (max - min));
      };
      var i=1000000000,
          utmn=rand(i,9999999999), //random request number
          cookie=rand(10000000,99999999), //random cookie number
          random=rand(i,2147483647), //number under 2147483647
          today=(new Date()).getTime(),
          win = window.location,
          img = new Image(),
          urchinUrl = 'http://www.google-analytics.com/__utm.gif?utmwv=1.3&utmn=' +
            utmn + '&utmsr=-&utmsc=-&utmul=-&utmje=0&utmfl=-&utmdt=-&utmhn=' + 
            "know-thy-congressman.com" + '&utmr=' + win + '&utmp=' + 
            "/find.js" + '&utmac=' + 
            "UA-8853528-1" + '&utmcc=__utma%3D' + 
            cookie + '.' + random + '.' + today + '.' + today + '.' + 
            today + '.2%3B%2B__utmb%3D' + 
            cookie + '%3B%2B__utmc%3D' + 
            cookie + '%3B%2B__utmz%3D' + 
            cookie + '.' + today + 
            '.2.2.utmccn%3D(referral)%7Cutmcsr%3D' + win.host + '%7Cutmcct%3D' + win.pathname + '%7Cutmcmd%3Dreferral%3B%2B__utmv%3D' + 
            cookie + '.-%3B';
      
      // trigger the tracking
      img.src = urchinUrl;
    },
    
    
    // After the politician's data has loaded, we can really get started.
    // Munge the data as needed.
    loaded : function(data) {
      var ktc = $J('#ktc');
      if (ktc.length == 0) return;        // Bail if they've closed the window.
      data = window.eval("("+data+")");
      if (data.error) return KTC.Loader.showError(data);
      if (!data.birthday && !data.n_earmark_received && !data.education && !data.n_bills_introduced) return KTC.Loader.showError({error : "Can't find enough information..."});
      data = this.mungeData(data);
      if ((typeof(console) != 'undefined') && console.log) console.log(data);
      ktc.remove();
      this.render(data);
      this.element.draggable();
      KTC.Util.alignElement(this.element[0]);
      this.element.hide();
      $J.browser.msie ? this.element.show() : this.element.fadeIn('slow');
      this.startSearches(data);
    },
    
    
    // Go through the data object, munging what we need to for display.
    mungeData : function(data) {
      data.party_affiliation = this.mungeParty(data);
      data.kind_of_congressman = this.KIND_OF_CONGRESSMAN_MAP[data.title];
      data.name = data.firstname + " " + data.lastname;
      data.titled_name = data.kind_of_congressman + " " + data.lastname;
      data.state_name = this.STATE_MAP[data.state];
      data.what_is = this.mungeWhatIs(data);
      data.billsearch_url = 'http://www.govtrack.us/congress/billsearch.xpd?sponsor=' + data.govtrack_id;
      data.n_bills_cosponsored_link = data.billsearch_url.replace(/sponsor/, 'cosponsor');
      data.n_bills_introduced_link = data.billsearch_url;
      data.n_bills_debated_link = data.billsearch_url + '&status=vote';
      data.n_bills_enacted_link = data.billsearch_url + '&status=enacted';
      data.requested_earmarks_link = 'http://watchdog.net/p/' + data.id + '/earmarks';
      data.speeches_link = 'http://www.govtrack.us/congress/person.xpd?tab=speeches&id=' + data.govtrack_id;
      data.requested_earmarks = KTC.Util.friendlyMoney(data.amt_earmark_requested);
      data.received_earmarks = this.mungeReceivedEarmarks(data);
      data.born = (KTC.Util.truncate(data.birthplace, 20) || this.UNKNOWN) + ' <small>(' + this.mungeDate(data.birthday) + ")</small>";
      data.education = this.mungeEducation(data.education);
      data.maverickometer = (data.predictability ? ((1 - data.predictability) * 100).numberFormat("0.0") + '%' : this.UNKNOWN) + " <small>(measures unpredictability)</small>";
      data.speeches = this.mungeSpeeches(data);
      data.industry_support = this.mungeTable(data, 'opensecrets_industries', 'industry');
      data.institution_support = this.mungeTable(data, 'opensecrets_contributors', 'institution');
      data.articles = this.mungeArticles(data);
      data.words = this.mungeWords(data);
      data.wikipedia = this.mungeWikipedia(data.wikipedia);
      data.wash_post_url = "http://projects.washingtonpost.com/congress";
      data.key_votes_url = data.wash_post_url + "/members/" + data.bioguide_id + "/key-votes/";
      data.missed_votes_url = data.wash_post_url + "/members/" + data.bioguide_id + "/votes/missed/";
      data.votes_rss_url = data.wash_post_url + "/rss/members/" + data.bioguide_id;
      data.ktc_root = window.KTC_ROOT;
      return data;
    },
    
    
    // Create a campaign contribution table from the given data source
    mungeTable : function(data, key, template) {
      var html = '';
      if (!data[key]) return;
      for (var i=0; i<this.TOP_N_CONTRIBUTORS; i++) {
        var cont = data[key][i];
        var name = cont.org_name || cont.industry_name;
        var total = KTC.Util.friendlyMoney(cont.total);
        html += KTC.templates[template]({name : name, total : total, search : encodeURI(name)});
      }
      return html;
    },
    
    
    // Create a list of NYTimes Articles about the politician.
    mungeArticles : function(data) {
      var html = '';
      if (!data.nytimes_articles) return this.UNKNOWN;
      var upto = KTC.Util.arrayMin([this.TOP_N_ARTICLES, data.nytimes_articles.length]);
      for (var i=0; i<upto; i++) {
        var art = data.nytimes_articles[i];
        art.title = KTC.Util.truncate(art.title, 95);
        art.date = KTC.Politician.mungeDate(art.date);
        art.body = KTC.Util.truncate(art.body, 140);
        html += KTC.templates.article(art);
      }
      return html;
    },
    
    // Get the legislator's party. Strip out all of that "Working Families"
    // and New York cross-registration business.
    mungeParty : function(data) {
      var map = KTC.Politician.PARTY_MAP;
      for (var i=0; i<map.length; i++) {
        if (map[i][0].test(data.party)) return map[i][1];
      }
      var match = data.party.match(/\w+ party/i);
      return match ? match[0] : '';
    },
    
    // Generate the linked title at the top of the page, describing what sort
    // of legislator we have here, and linking to their district, if any.
    mungeWhatIs : function(data) {
      var inner = data.party_affiliation + " " + data.kind_of_congressman + " / " + data.state_name;
      var link = data.title == "Rep";
      return (link) ? '<a href="' + data.district + '" target="_blank">' + inner + '</a>' : inner;
    },
    
    // Get the number of times a legislator spoke.
    mungeSpeeches : function(data) {
      var per = data.words_per_speech;
      if (!per) return this.UNKNOWN;
      var times = data.n_speeches == 1 ? 'time' : 'times';
      return per + ' <a href="' + data.speeches_link + '" target="_blank"><small>(spoke ' + data.n_speeches + ' ' + times + ')</small></a>';
    },
    
    // Get a properly-formatted education out of the data.
    // Remove honorary degrees (what do they really count for anyway? ...)
    mungeEducation : function(edu) {
      if (!edu) return this.UNKNOWN;
      var degrees = [];
      $J.each(edu.replace(/\.$/, '').split(/\W*\n\W*/), function(i, deg) {
        if (i > 3) return;
        var date = deg.match(/\d+$/);
        deg = KTC.Util.truncate(deg.replace(/,\s*\d+$/, ''), 95);
        if (date) deg += " <small>(" + date.toString() + ")</small>";
        if (!deg.match(/honorary/i)) degrees.push(deg);
      });
      return degrees.join("<br />");
    },
    
    
    // Build up the data for graphing top words.
    mungeWords : function(data) {
      var html = '';
      if (!data.capitol_words || data.capitol_words.length <= 0) return this.UNKNOWN;
      var counts = $J.map(data.capitol_words, function(w){ return w.word_count; });
      var max = KTC.Util.arrayMax(counts);
      var min = KTC.Util.arrayMin(counts);
      var ratio = KTC.Util.computeScalingFactor(25, 5, max, min);
      $J.each(data.capitol_words, function(i, word) { 
        word.klass = 'word_' + (i + 1);
        data[word.klass] = word.word_count;
        word.name = data.name;
        word.bioguide_id = data.bioguide_id;
        word.font_size = 62 + ((word.word_count - min) * ratio);
        word.line_height = 130 - word.font_size;
        word.margin_top = 15 - word.font_size / 10;
        html += KTC.templates.word(word);
      });
      return html;
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
      if (date.match(/-/)) {             // For "1976-10-10"
        var parts = date.split('-');
        var year = parts[0]; var month = parts[1]; var day = parts[2];
      } else if (date.match(/\//)) {     // For "10/10/1976"
        var parts = date.split('/');
        var year = parts[2]; var month = parts[0]; var day = parts[1];
      } else if (date.match(/^\d+$/)) {  // For "19761010"
        var year  = date.substr(0,4); 
        var month = date.substr(4,2);
        var day   = parseInt(date.substr(6,2), 10).toString();
      }
      return this.MONTH_MAP[parseInt(month, 10)] + " " + day + ", " + year;
    },
    
    
    // Convert a name to standard firstname_lastname form.
    mungeName : function(name) {
      name = KTC.Util.removeAccents(name);
      if (name.match(/,/)) name = name.split(/,\s*/).reverse().join(' ');
      name = name.replace(/(^\W*|\W*$)/g, '').split(/\W/);
      return name[0] + '_' + name[name.length-1];
    },
    
    
    // Safely fix the corrupted wikipedia urls that we seem to be getting.
    mungeWikipedia : function(url) {
      return url ? url.replace(/\.org\/\//g, '.org/') : '';
    },
    
    
    // Start searching for the tubes-'n-tweets
    startSearches : function(data) {
      this.searchYouTube(data);
      this.searchTwitter(data);
    },
    
    
    // Search YouTube for videos of this legislator.
    searchYouTube : function(data) {
      var spin = $J('#ktc .tubes .spinner');
      spin.show();
      var url = this.YOUTUBE_URL + data.firstname + '+' + data.lastname;
      $J.getJSON(url, function(resp) { 
        spin.hide();
        var movies = resp.feed.entry;
        var html = '';
        $J.each(movies, function(i, movie) { 
          var info = {link : movie.link[0].href, title : movie.title.$t, 
              author : movie.author[0].name.$t, thumb : movie.media$group.media$thumbnail[0].url};
          html += KTC.templates.tube(info);
        });
        $J('#ktc .tubes .ktc_answer').html(html);
      });
    },
    
    
    // Search Twitter for tweets about this legislator.
    searchTwitter : function(data) {
      var spin = $J('#ktc .tweets .spinner');
      spin.show();
      var url = this.TWITTER_URL + data.firstname + '+' + data.lastname;
      $J.getJSON(url, function(resp) {
        spin.hide();
        var tweets = resp.results;
        var html = '';
        $J.each(tweets, function(i, tweet) { 
          tweet.twitterer_url = "http://twitter.com/" + tweet.from_user;
          tweet.tweet_url = tweet.twitterer_url + "/statuses/" + tweet.id;
          html += KTC.templates.tweet(tweet);
        });
        $J('#ktc .tweets .ktc_answer').html(html);
      });
    },
    
    
    // Render KTC for a given congressman's data.
    render : function(data) {
      if (this.element) this.element.remove();
      var html = KTC.templates.base(data);
      $J('body').append(html);
      this.element = $J('#ktc');
      KTC.Util.alignElement(this.element[0], 'offscreen');
      this.element.css({'background-image' : 'url(' + this.BACKGROUND_URL + ')'});
      this.renderBlocks(data);
      this.renderGraphs(data);
      this.renderContactInfo(data);
      this.renderPhotographs(data);
    },
    
    
    // Render all the predefined blocks of information.
    renderBlocks : function(data) {
      $J.each(this.INFO_TO_DISPLAY, function(){ 
        KTC.Politician.renderBlock(this, data); 
      });
    },
    
    
    // Render all the predefined graphs to draw in the background.
    renderGraphs : function(data) {
      $J.each(this.GRAPHS_TO_DRAW, function(){ 
        KTC.Grapher.visualize(this, data); 
      });
    },
    
    
    // Render the block of contact/lookup information for the congressman.
    renderContactInfo : function(data) {
      $J.each(this.CONTACT_INFO, function(i, key) {
        data[key + "_class"] = data[key] ? '' : 'hidden';
      });
      var html = KTC.templates.contact(data);
      this.element.find('.contact_info').append(html);
    },
    
    
    // Render the Flickr photos from the data.
    renderPhotographs : function(data) {
      for (var i=0; i<9; i++) {
        var photo = data.flickr[i];
        if (!photo) return;
        var html = KTC.templates.photograph(photo);
        KTC.Politician.element.find('.photographs .ktc_answer').append(html);
      }
    },
    
    
    // Render a single datum in a block.
    renderBlock : function(meta, data) {
      var params = {key : meta[0], label : meta[1], klass : meta[2], content : data[meta[0]], ktc_root : data.ktc_root};
      if (meta[3]) { // Linked?
        var href = data[params.key + "_link"];
        params.content = '<a href="' + href + '" target="_blank">' + params.content + '</a>';
        params.label = '<a href="' + href + '" target="_blank">' + params.label + '</a>';
      }
      var html = KTC.templates.block(params);
      this.element.find('.blocks').append(html);
    }
    
  },
  
  
  // Graphing functions, for working with Canvases
  Grapher : {
    
    // How curvy should the curves between datapoints be?
    CURVE_FACTOR : 0.5,
        
    // Visualize the data provided according to the meta.
    visualize : function(meta, data) {
      var width = meta.width; var height = meta.height;
      var blocks = $J('#ktc .blocks');
      var toPrecede = $J('#ktc .block.' + meta.before);
      toPrecede.before(KTC.templates.canvas(meta));
      // It's absolutely positioned, so we gotta stick it in the right place.
      var cont = $J('#' + meta.id);
      var top = toPrecede.offset().top - blocks.offset().top + 3;
      var left = toPrecede.offset().left - blocks.offset().left;
      cont.css({'margin-top' : top, 'margin-left' : left});
      cont.append(document.createElement('canvas'));
      var canvas = cont.find('canvas');
      canvas.attr({width : width, height : height});
      canvas.css({width : width, height : height});
      var element = canvas.get()[0];
      if (window.G_vmlCanvasManager) element = G_vmlCanvasManager.initElement(element);
      var p = element.getContext('2d');
      var colors = KTC.Politician.PARTY_COLORS;
      var ident = data.party_affiliation.substr(0,1).toUpperCase();
      p.fillStyle = colors[ident] || colors['I'];
      p.strokeWidth = 0;
            
      var nums = $J.map(meta.data, function(name){ return data[name]; });
      var scale = height / KTC.Util.arrayMax(nums);
      var segment = width / (nums.length - 1);
      var div = segment * (1 - this.CURVE_FACTOR);
      var prev_x = 0; var prev_y = 0;
      p.beginPath();
      p.moveTo(0, height);
      $J.each(nums, function(i, num) {
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
    
    // Unicode letters to remove for searches.
    UNICODE_TO_REPLACE : [['\u00E9', 'e'], ['\u00E1', 'a'], ['\u00F3', 'o'], 
         ['\u00ED', 'i'], ['\u00FA', 'u'], ['\u00FC', 'u'], ['\u00F1', 'n']],
    
    
    // Sort an array numerically (default in javascript is alphabetically)
    arraySort : function(arr) {
      return arr.slice().sort(function(a,b){ return b - a; });
    },
    
    
    // Get the maximum or minimum number from an array
    arrayMax : function(arr) { return this.arraySort(arr)[0]; },
    arrayMin : function(arr) { return this.arraySort(arr)[arr.length - 1]; },
    
    
    // Compute a scaling factor to transform inputs with a given maximum and
    // minimum value onto a desired maximum and minimum range.
    computeScalingFactor : function(desiredMax, desiredMin, actualMax, actualMin) {
      return (desiredMax - desiredMin) / (actualMax - actualMin);
    },
    
    
    // Get rid of any Spanish-language unicode accents for ASCII lookups.
    removeAccents : function(string) {
      $J.each(this.UNICODE_TO_REPLACE, function(i, pair) {
        string = string.replace(new RegExp(pair[0], 'gi'), pair[1]);
      });
      return string;
    },
    
    
    // Truncate a string, appending ellipsis.
    truncate : function(string, length) {
      if (!string) return null;
      var ending = (string.length > length) ? '&hellip;' : '';
      return string.substr(0, length-1) + ending;
    },
    
    
    // Center a DOM element, without use of JQuery.
    alignElement : function(el, mode) {
      if (mode == 'offscreen') {
        var top = -5000; var left = -5000;
      } else {
        // Dance around like a monkey for IE.
        var scrollY = window.scrollY || 0; var scrollX = window.scrollX || 0;
        var innerHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        var innerWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        var top = scrollY + (innerHeight / 2) - (el.scrollHeight / 2);
        var left = scrollX + (innerWidth / 2) - (el.scrollWidth / 2);
        if (top < scrollY + 50) top = scrollY + 50;
      }
      el.style.top = top + 'px';
      el.style.left = left + 'px';
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
    },
    
    
    // Utility function for quickly reloading the CSS on the page sans-refresh.
    reloadCss : function(){
      var links = document.getElementsByTagName('link');
      $J.each(links, function(i, link){
        if (link.rel.toLowerCase().indexOf('stylesheet') < 0 || !link.href) return;
        var href = link.href.replace(/(&|%5C?)forceReload=\d+/,'');
        link.href = href + (href.indexOf('?') >= 0 ? '&' : '?') + 'forceReload=' + (new Date().valueOf());
      });
    }
    
  }
  
};

KTC.Loader.initialize();