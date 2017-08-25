(function() {
  'use strict';

  var app = angular.module('token-sync', ['firebase']);

  app.controller('TokenSyncController',
    [
      '$scope', '$firebase', '$firebaseAuth', '$firebaseObject',
      function($scope, $firebase, $firebaseAuth, $firebaseObject) {
        $scope.roomsRef = firebase.database().ref('rooms');
        $scope.roomOwnersRef = firebase.database().ref('roomOwners');
        $scope.authObj = $firebaseAuth();
        $scope.actionInProgress = false;

        $scope.logIn = function(provider) {
          $scope.actionInProgress = true;
          if (!provider) {
            provider = 'google';
          }
          $scope.authObj.$signInWithPopup(provider).then(function(authData) {
            $scope.authData = authData;
            $scope.getExistingRooms();
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
            $scope.$apply();
          });
        };

        $scope.getExistingRooms = function() {
          $scope.actionInProgress = true;
          $scope.userRoomsRef = $scope.roomsRef.child($scope.authData.user.uid);
          $scope.existingRooms = $firebaseObject($scope.userRoomsRef);
          $scope.actionInProgress = false;
        };

        $scope.joinRoomIfExists = function(roomId, callback) {
          var joined = false;
          $scope.actionInProgress = true;

          $scope.roomOwnersRef.child(roomId).once('value', function(owner) {
            if (owner.val() === null) {
              if (callback) {
                callback(false);
              }
              return;
            }

            $scope.roomsRef.child(owner.val().id).once('value', function(snapshot) {
              if (snapshot.val() !== null) {
                $scope.roomRef = $scope.roomsRef.child(owner.val().id).child(roomId);
                $scope.room = $firebaseObject($scope.roomRef);
                joined = true;
              }
              $scope.actionInProgress = false;
              $scope.$apply();
              if (callback) {
                callback(joined);
              }
            });
          });
        };

        $scope.showInviteCode = function() {
          $scope.inviteCode = $scope.room.id;
        };

        $scope.createRoom = function() {
          $scope.actionInProgress = true;
          $scope.roomRef = $scope.roomsRef.child($scope.authData.user.uid).push();
          $scope.room = $firebaseObject($scope.roomRef);
          $scope.room.id = $scope.roomRef.key;
          $scope.room.name = $scope.roomName;
          $scope.room.tokenName = $scope.tokenName;
          $scope.room.$save();
          $scope.roomOwnersRef.child($scope.room.id).set({
            'id': $scope.authData.user.uid
          });
          $scope.actionInProgress = false;
        };
      }
    ]
  );
})();
