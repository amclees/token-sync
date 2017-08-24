(function() {
  'use strict';

  var app = angular.module("token-sync", ["firebase"]);

  app.controller("TokenSyncController",
    [
      "$scope", "$firebase", "$firebaseAuth",
      function($scope, $firebase, $firebaseAuth) {
        var room = null;
        try {
          var getParameters = window.location.search.split('&')[1].split('='),
              roomNext = false;
          for (var i = 0; i < getParameters.length; i++) {
            if (i % 2 === 0 && getParameters[i] === 'room') {
              room = getParameters[i + 1];
              break;
            }
          }
        } catch (error) {
          // Room parameter not included
        }

        $scope.rootRef = firebase.database().ref();
        $scope.authObj = $firebaseAuth();
        $scope.actionInProgress = false;

        $scope.logIn = function(provider) {
          $scope.actionInProgress = true;
          if (!provider) {
            provider = 'google';
          }
          $scope.authObj.$signInWithPopup(provider).then(function(authData) {
            $scope.authData = authData;
            $scope.actionInProgress = false;
          }, function(error) {
             console.error("Login failed: ", error);
          });
        };

        $scope.logOut = function() {
          $scope.actionInProgress = true;
          $scope.authObj.$signOut().then(function() {
            $scope.authData = null;
            $scope.room = null;
            $scope.actionInProgress = false;
          });
        };

        $scope.createRoom = function() {

        };
      }
    ]
  );
})();
