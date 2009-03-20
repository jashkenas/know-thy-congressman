class CongressionalController < ApplicationController
  layout nil
  
  # Search the APIs for congressional data, or return it from the cache.
  def find
    first_name, last_name = params[:name].split('_')
    first_name.downcase! and last_name.downcase!
    pol = Politician.search_for(first_name, last_name)
    info = pol.information
    respond_to do |format|
      format.json { render :json => info }
      format.js   { render_jsonp(info) }
      format.text { render :text => JSON.parse(info).to_yaml }
    end
  end
  
  
  # Grab all of the available javascript templates.
  def templates
    files = Dir["#{RAILS_ROOT}/app/views/js_templates/*.*"]
    @templates = files.map do |f| 
      {:name    => File.basename(f, '.html.erb'), :content => File.read(f) }
    end
    render :template => 'congressional/templates', :content_type => :js
  end
  
  
  # Dynamically render the bookmarklet javascript, for flexibility.
  def bookmarklet
    # Just render.
  end
  
end