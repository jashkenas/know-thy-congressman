class RemoveTheStatisticsTable < ActiveRecord::Migration
  def self.up
    drop_table :statistics
  end

  def self.down
    create_table :statistics do |t|
      t.text 'json', :null => false, :default => '{}'
      t.timestamps
    end
  end
end
