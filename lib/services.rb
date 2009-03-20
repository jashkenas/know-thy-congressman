require 'rest_client'
require 'json'

# Preload all the services because autoloading isn't reliable enough with threads.
%w(base capitol_words flickr new_york_times open_secrets sunlight watchdog).each do |service|
  require "#{RAILS_ROOT}/lib/services/#{service}"
end

# Services is like a sleuth that digs up the dirt on congressmen.
# Let's try to keep it all as stateless as possible, so that the threads don't
# step on each others toes.
module Services
  
  # If we can't find a resource for a particular congressman, then:
  class NotFoundException < RuntimeError; end



  # data = {'search_first_name' => first_name, 'search_last_name' => last_name}
  #   sunlight_data, watchdog_data, flickr_data, contributor_data, industry_data, tags_data, articles_data, words_data = 
  #     {}, {}, {}, {}, {}, {}, {}, {}
  #     
  #   sunlight = Thread.new { sunlight_data = Sunlight.search(first_name, last_name) }
  #   sunlight.join
  #   merge_data(data, sunlight_data)
  #   raise NotFoundException, "Can't find a politician by that name..." if sunlight_data.empty?
  
  
  
  # Dig up all the dirt available about a congressman...
  def self.dig_up_dirt(politician)
    watchdog_data, flickr_data, contributor_data, industry_data, tags_data, articles_data, words_data = 
      {}, {}, {}, {}, {}, {}, {}
    first_name, last_name = politician.first_name, politician.last_name
    bioguide_id = politician.bioguide_id
    data = JSON.parse(politician.json)
    
    puts "starting: #{politician.first_name} #{politician.last_name}"
            
    watchdog = Thread.new { watchdog_data = Watchdog.search(bioguide_id) }
    flickr   = Thread.new { flickr_data   = Flickr.search(first_name, last_name) }
    tags     = Thread.new { tags_data     = NewYorkTimes.search_tags(first_name, last_name) }
    words    = Thread.new { words_data    = CapitolWords.search(bioguide_id) }
    
    watchdog.join and tags.join
    merge_data(data, watchdog_data, tags_data)
    os_id, person_facet = data['opensecretsid'], data['person_facet']
    
    contributor = Thread.new { contributor_data = OpenSecrets.search_contributors(os_id) }
    industry    = Thread.new { industry_data    = OpenSecrets.search_industries(os_id) }
    articles    = Thread.new { articles_data    = NewYorkTimes.search_articles(person_facet) }
    
    contributor.join and industry.join and articles.join and flickr.join and words.join
    merge_data(data, contributor_data, industry_data, articles_data, flickr_data, words_data)
    
    puts "done with: #{politician.first_name} #{politician.last_name}"
    
    data
  end
  
  
  private
  
  # Merge data from disparate APIs into a single body of (soon-to-be) JSON:
  def self.merge_data(data, *results)
    results.each {|result| data.merge!(result) }
  end
  
end