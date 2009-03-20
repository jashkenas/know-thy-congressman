module Services

  module Sunlight
    extend Base

    SEARCH = 'services.sunlightlabs.com/api/legislators.search.json'
    ALL    = 'services.sunlightlabs.com/api/legislators.getList.json'

    # Dig up dirt from Sunlight Labs...
    def self.search(first_name, last_name)
      safe_request('sunlight') do
        url = "#{SEARCH}?apikey=#{SECRETS['sunlight']}&name=#{first_name} #{last_name}"
        # We need to perform a little weighting ourselves, because Sunlight labs
        # sometimes produces wonky results (try searching for "Bill Young")...
        candidates = get_json(url)['response']['results']
        return {} if candidates.empty?
        candidates.each do |c|
          cand = c['result']
          cand['score'] += 0.3 if cand['legislator']['firstname'].match(/#{first_name}/i)
          cand['score'] += 0.3 if cand['legislator']['lastname'].match(/#{last_name}/i)
        end
        winner = candidates.sort_by {|cand| cand['result']['score'] }.last
        score = winner['result']['score']
        raise Services::NotFoundException, "Can't find a politician by that name..." unless score > 1
        winner['result']['legislator']['sunlight_score'] = score
        winner['result']['legislator']
      end
    end
    
    
    # Get a list of all Sunlight Labs information for all legislators.
    # Pass "all_legislators=true" to get data on legislators from past congresses.
    def self.get_all_politicians
      safe_request('all_legislators') do
        url = "#{ALL}?apikey=#{SECRETS['sunlight']}"
        get_json(url)['response']['legislators']
      end
    end

  end

end