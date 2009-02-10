# Sleuth digs up the dirt on congressmen.

require 'rest_client'
require 'json'

class Sleuth
  
  WATCHDOG       = 'watchdog.net'
  SUNLIGHT       = 'services.sunlightlabs.com/api'
  OPENSECRETS    = 'www.opensecrets.org/api/?output=json'
  FLICKR         = 'api.flickr.com/services/rest?method=flickr.photos.search&format=json&nojsoncallback=1&sort=relevance&per_page=10&extras=owner_name'
  TIMES_TAGS     = 'api.nytimes.com/svc/timestags/suggest?filter=(Per)'
  TIMES_ARTICLES = 'api.nytimes.com/svc/search/v1/article?fields=title,url,body,date'
  CAPITOL_WORDS  = 'www.capitolwords.org/api/lawmaker'
  
  ONE_YEAR_IN_SECONDS = 31557600
  
  
  # Dig up all the dirt available about a congressman...
  def dig_up_dirt(first_name, last_name)
    @data = {}
    first_name.downcase! and last_name.downcase!
    sunlight_data, watchdog_data, flickr_data, contributor_data, industry_data, tags_data, articles_data, words_data = 
      {}, {}, {}, {}, {}, {}, {}, {}
      
    sunlight = Thread.new { sunlight_data = search_sunlight_labs(first_name, last_name) }
    sunlight.join
    merge_data(sunlight_data)
    first_name, last_name = extract_name_from_congresspedia
    bioguide_id = @data['bioguide_id']
    
    watchdog = Thread.new { watchdog_data = search_watchdog(bioguide_id) }
    flickr   = Thread.new { flickr_data   = search_flickr(first_name, last_name) }
    tags     = Thread.new { tags_data     = search_nytimes_tags(first_name, last_name) }
    words    = Thread.new { words_data    = search_capitol_words(bioguide_id) }
    
    watchdog.join and tags.join
    merge_data(watchdog_data, tags_data)
    os_id, person_facet = @data['opensecretsid'], @data['person_facet']
    
    contributor = Thread.new { contributor_data = search_opensecrets_contributors(os_id) }
    industry    = Thread.new { industry_data    = search_opensecrets_industries(os_id) }
    articles    = Thread.new { articles_data    = search_nytimes_articles(person_facet) }
    
    contributor.join and industry.join and articles.join and flickr.join and words.join
    merge_data(contributor_data, industry_data, articles_data, flickr_data, words_data)
  end
  
  
  # Dig up dirt from Sunlight Labs...
  def search_sunlight_labs(first_name, last_name)
    safe_request('sunlight') do
      url = "#{SUNLIGHT}/legislators.search.json?apikey=#{SECRETS['sunlight']}&name=#{first_name} #{last_name}"
      # We need to perform a little weighting ourselves, because Sunlight labs
      # sometimes produces wonky results (try searching for "Bill Young")...
      candidates = get_json(url)['response']['results']
      candidates.each do |c|
        cand = c['result']
        cand['score'] += 0.3 if cand['legislator']['firstname'].match(/#{first_name}/i)
        cand['score'] += 0.3 if cand['legislator']['lastname'].match(/#{last_name}/i)
      end
      winner = candidates.sort_by {|cand| cand['result']['score'] }.last
      winner['result']['legislator']
    end
  end
  
  
  # Dig up dirt about a given congressman at watchdog...
  def search_watchdog(bioguide_id)
    safe_request('watchdog', :ensure => bioguide_id) do
      dog = Net::HTTP.new(WATCHDOG, 80)
      redirected = dog.get("/p/search.json?bioguideid=#{bioguide_id}")
      url = "#{redirected.header['location']}.json"      
      data = get_json(url).first
      data.delete 'bills_sponsored'     # Just a buncha URLS, not too useful.
      data.delete 'earmarks_sponsored'  # Always seems to return a list of nils.
      data
    end
  end
  
  
  # Dig up (embarrassing) photos of the politician on Flickr...
  def search_flickr(first_name, last_name)
    safe_request('flickr') do
      url = "#{FLICKR}&api_key=#{SECRETS['flickr_key']}&text=\"#{first_name} #{last_name}\""
      data = get_json(url)
      {'flickr' => data['photos']['photo']}
    end
  end
  
  
  # Dig up dirt from OpenSecrets.org about individual campaign contributors...
  def search_opensecrets_contributors(bioguide_id)
    safe_request('opensecrets contributors', :ensure => bioguide_id) do
      url = "#{OPENSECRETS}&method=candContrib&cid=#{bioguide_id}&apikey=#{SECRETS['opensecrets']}"
      info = get_json(url)['response']['contributors']['contributor']
      {'opensecrets_contributors' => info.map {|el| el['@attributes'] } }
    end
  end
  
  
  # Dig up dirt from OpenSecrets.org about industry campaign contributors...
  def search_opensecrets_industries(id)
    safe_request('opensecrets industries', :ensure => id) do
      url = "#{OPENSECRETS}&method=candIndustry&cid=#{id}&apikey=#{SECRETS['opensecrets']}"
      info = get_json(url)['response']['industries']['industry']
      {'opensecrets_industries' => info.map {|el| el['@attributes'] } }
    end
  end
  
  
  # Dig up the Person Facet from the Gray Lady...
  def search_nytimes_tags(first_name, last_name)
    safe_request('times tags') do
      url = "#{TIMES_TAGS}&api-key=#{SECRETS['times_tags']}&query=#{first_name} #{last_name}"
      result = get_json(url)['results'].first
      facet = result ? result.sub(/\s*\(Per\)\Z/, '').upcase : nil
      {'person_facet' => facet}
    end
  end
  
  
  # Dig up a list of articles from the Gray Lady...
  #
  # Nota Bene: In order to use the NYTimes Articles API, you need to request 
  # urls that are invalid from the viewpoint of Ruby's URI class. We work around
  # URI.parse by using a raw Net::HTTP request instead of RestClient.
  def search_nytimes_articles(facet)
    safe_request('times articles', :ensure => facet) do
      url = "#{TIMES_ARTICLES}&api-key=#{SECRETS['times_articles']}&query=per_facet:[#{facet}]"
      results = get_json(url)['results']
      {'nytimes_articles' => results}
    end
  end
  
  
  # Dig up the top 5 words in speeches by the politician over the course of the
  # last year.
  def search_capitol_words(bioguide_id)
    safe_request('capitol words') do
      now, past = Time.now, Time.now - ONE_YEAR_IN_SECONDS
      url = [CAPITOL_WORDS, bioguide_id, past.year, past.month, past.day, 
             now.year, now.month, now.day, 'top5.json'].join('/')
      {'capitol_words' => get_json(url) }
    end
  end
  
  
  private
  
  # Use the JSON and RestClient gems to get json from a url
  def get_json(url)
    begin
      JSON.parse(RestClient.get(URI.encode(url)))
    rescue JSON::ParserError => e                 # Faux-log any failed requests.
      @data['failed_requests'] ||= []
      @data['failed_requests'] <<  url
      {}
    end
  end
  
  
  # Merge data from disparate APIs into a single body of (soon-to-be) JSON:
  def merge_data(*results)
    results.each {|result| @data.merge!(result) }
    @data
  end
  
  
  # We really need to try to get a valid first name and last name. The sunlight
  # labs API takes care of searching for a congressperson, but sometimes returns
  # names with extra junk (like initials). Use the congresspedia url instead.
  def extract_name_from_congresspedia
    name  = @data['congresspedia_url'].match(/title=(\w+)\Z/)[1].split('_')
    first = @data['firstname'] = name[0]
    last  = @data['lastname']  = name[-1]
    return first, last
  end
  
  
  # Ensure that a failed api call doesn't screw up the remainder of our data.
  def safe_request(title, opts={})
    puts "starting: #{title}"
    result = {}
    return result if opts.has_key?(:ensure) && !opts[:ensure]
    begin
      result = yield
      puts "done with: #{title}"
    rescue RestClient::Exception => e
      result = {}
      puts "error for: #{title} ... #{e}"
    end
    result
  end
  
end