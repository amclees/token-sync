(function() {
  'use strict';

  var app = angular.module('token-sync', ['firebase']);

  app.controller('TokenSyncController',
    [
      '$scope', '$firebase', '$firebaseAuth', '$firebaseObject',
      function($scope, $firebase, $firebaseAuth, $firebaseObject) {
        var roomId = null;
        try {
          var getParameters = window.location.search.split('&')[1].split('='),
              roomNext = false;
          for (var i = 0; i < getParameters.length; i++) {
            if (i % 2 === 0 && getParameters[i] === 'room') {
              roomId = getParameters[i + 1];
              break;
            }
          }
        } catch (error) {
          // Room parameter not included
        }

        if (roomId) {
          $scope.joinRoomById(room);
        }

        $scope.roomsRef = firebase.database().ref('rooms');
        $scope.authObj = $firebaseAuth();
        $scope.actionInProgress = false;

        $scope.logIn = function(provider) {
          $scope.actionInProgress = true;
          if (!provider) {
            provider = 'google';
          }
          $scope.authObj.$signInWithPopup(provider).then(function(authData) {
            $scope.authData = authData;
            $scope.joinUserRoomIfExists();
          }, function(error) {
             console.error('Login failed: ', error);
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

        $scope.joinUserRoomIfExists = function() {
          $scope.actionInProgress = true;
          $scope.roomsRef.child($scope.authData.user.uid).once('value', function(snapshot) {
            if (snapshot.val() !== null) {
              $scope.roomRef = $scope.roomsRef.child($scope.authData.user.uid);
              $scope.room = $firebaseObject($scope.roomRef);
            }
            $scope.actionInProgress = false;
          });
        };


        $scope.joinRoomByInvite = function(invite) {

        };

        $scope.createRoom = function() {
          $scope.actionInProgress = true;
          $scope.roomRef = $scope.roomsRef.child($scope.authData.user.uid);
          $scope.room = $firebaseObject($scope.roomRef);
          $scope.room.name = $scope.roomName;
          $scope.room.tokenName = $scope.tokenName;
          $scope.room.$save();
          $scope.actionInProgress = false;
        };
      }
    ]
  );
})();
