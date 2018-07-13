module.exports = {
  persistStory: function(text, channel_id, user_id, avApiClient, repository) {

    var newStory = {
      name: text,
      source: channel_id,
      userId: user_id
    };

    var persistenceUidKey = "persistence-id-"+ channel_id + "-" + text;
    console.log('before: avApiClient.createStory')
    avApiClient.createStory( newStory, function (err, data, response) {
      console.log('avApiClient.createStory')
      if (err) {
        console.log("ERROR CREATING STORY: " + err)
        repository.del( persistenceUidKey, (delerr, reply) => {
          if (delerr) {
            // handle error?
            console.log(delerr)
          }
        });
      }
      else {
        console.log('key: ' + persistenceUidKey)
        repository.set(persistenceUidKey, data._id, (err, reply) => {
          if (err) {
            // handle error?
            console.log(err)
          }
        });
      }
    })
    console.log('after: avApiClient.createStory')
  },

  persistVote: function(text, channel_id, user_id, voteString, avApiClient, repository) {

    var persistenceUidKey = "persistence-id-"+ channel_id + "-" + text;

    repository.get( persistenceUidKey, (err, storyId) => {
      
      if (err || (!storyId)) {
        // handle error
        console.log(err)
      }
      else {
        var fields = {
          user_id: user_id,
          size: voteString
        };

        avApiClient.createVote(storyId, fields, (err, data, response) => {
          if (err) {
            // handle error
            console.log(err)
          }
        });
      }
    });
  },

  
  persistReveal: function(text, channel_id, avApiClient, repository) {
    var persistenceUidKey = "persistence-id-"+ channel_id + "-" + text;

    repository.get( persistenceUidKey, (err, storyId) => {
      if (err) {
      // handle error
      console.log(err)
      }
      else {
        var fields = {
          // user_id: user_id, //NOTE: we should store id of user who revealed, and timestamp
          size: '4'
        };
        avApiClient.updateStorySize(storyId, fields, (err, data, response) => {
          if (err) {
            // handle error
            console.log(err)
          }
        });
      }
    });
  }
}