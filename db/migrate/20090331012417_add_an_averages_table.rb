class AddAnAveragesTable < ActiveRecord::Migration
  def self.up
    create_table :statistics do |t|
      t.text 'json', :null => false, :default => '{}'
      t.timestamps
    end
  end

  def self.down
    drop_table :statistics
  end
end
