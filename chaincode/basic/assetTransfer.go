/*
SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"log"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
	"github.com/hyperledger/fabric-samples/asset-transfer-basic/chaincode-go/chaincode"
)

func main() {
	certificateChaincode, err := contractapi.NewChaincode(&chaincode.SmartContract{})
	if err != nil {
		log.Panicf("Error creating certificate lifecycle chaincode: %v", err)
	}

	if err := certificateChaincode.Start(); err != nil {
		log.Panicf("Error starting certificate lifecycle chaincode: %v", err)
	}
}
