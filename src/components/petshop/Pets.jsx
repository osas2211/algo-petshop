import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import AddPet from "./AddPet";
import PetCard from "./PetCard";
import ModOptions from "./ModOptions";
import Loader from "../utils/Loader";
import { NotificationError, NotificationSuccess } from "../utils/Notifications";
import { microAlgosToString } from "../../utils/conversions";
import {
  createModContract,
  updateFeeAction,
  getModContract,
} from "../../utils/modContract";

import {
  adoptPetAction,
  createPetAction,
  deletePetAction,
  getPetsAction,
} from "../../utils/petContract";

import PropTypes from "prop-types";
import { Row } from "react-bootstrap";

const Pets = ({ address, fetchBalance }) => {
  const modContractTemplate = {
    appId: "a",
    adoptFee: 0,
  };

  const [pets, setPets] = useState([]);
  const [modContract, setModContract] = useState(modContractTemplate);
  const [loading, setLoading] = useState(false);
  const [petsFetchComplete, setPetFetch] = useState(false);
  const [modFetchComplete, setModFetch] = useState(false);

  // function to get list of pets
  const getPets = useCallback(async () => {
    setLoading(true);
    getPetsAction()
      .then((pets) => {
        if (pets) {
          setLoading(true);
          setPets(pets);
        }
      })
      .catch((error) => {
        console.log(error);
      })
      .finally((_) => {
        setPetFetch(true);
        setLoading(false);
      });
  }, []);

  const getModStatus = useCallback(async () => {
    getModContract()
      .then((modC) => {
        if (modC) {
          setModContract(modC);
        }
      })
      .catch((error) => {
        console.log(error);
      })
      .finally((_) => {
        setModFetch(true);
      });
  }, []);

  const createPet = async (data) => {
    setLoading(true);
    createPetAction(address, data)
      .then(() => {
        toast(<NotificationSuccess text="Pet added successfully." />);
        getPets();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to add pet." />);
      })
      .finally((_) => {
        setLoading(false);
      });
  };

  const adoptPet = async (pet) => {
    setLoading(true);
    adoptPetAction(address, pet, modContract)
      .then(() => {
        toast(<NotificationSuccess text="Pet adopted successfully" />);
        getPets();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to adopt pet." />);
        setLoading(false);
      })
      .finally((_) => {
        setLoading(false);
      });
  };

  const deletePet = async (pet) => {
    setLoading(true);
    deletePetAction(address, pet.appId)
      .then(() => {
        toast(<NotificationSuccess text="Pet deleted successfully" />);
        getPets();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to delete pet." />);
        setLoading(false);
      })
      .finally((_) => {
        setLoading(false);
      });
  };

  //Mod Methods
  const createMod = async (adoptionFee) => {
    setLoading(true);
    createModContract(address, adoptionFee)
      .then(() => {
        toast(
          <NotificationSuccess text="Mod contract created successfully." />
        );
        getModStatus();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to create mod contract." />);
        setLoading(false);
      })
      .finally((_) => {
        setLoading(false);
      });
  };

  const updateFee = async (newFee) => {
    setLoading(true);
    updateFeeAction(address, modContract, newFee)
      .then(() => {
        toast(<NotificationSuccess text="Adoption Fee updated successfully" />);
        getModStatus();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to update fee" />);
        setLoading(false);
      })
      .finally((_) => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let ignore = false;

    if (!ignore && !modFetchComplete && !petsFetchComplete) {
      getPets(ignore);
      getModStatus(ignore);
    }

    return () => {
      ignore = true;
    };
  }, [modFetchComplete, petsFetchComplete, getPets, getModStatus]);

  if (loading) {
    return <Loader />;
  }
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fs-4 fw-bold mb-0">ALGO PET SHOP</h1>

        <div className="d-flex justify-content-between">
          <AddPet createPet={createPet} />
          <ModOptions
            createMod={createMod}
            updateFee={updateFee}
            modContract={modContract}
          />
        </div>
      </div>
      <div className="text-start container">
        <div id="adoptionNotice" className="mb-4" style={{ marginTop: "1em" }}>
          <span>
            <i className="bi bi-bell-fill"></i> Adoption Fee is{" "}
            {modContract.adoptFee
              ? microAlgosToString(modContract.adoptFee)
              : 0}{" "}
            ALGO
          </span>
        </div>
      </div>
      <Row xs={1} sm={2} lg={3} className="g-3 mb-5 g-xl-4 g-xxl-5">
        <>
          {pets.map((pet, index) => (
            <PetCard
              address={address}
              pet={pet}
              adoptPet={adoptPet}
              deletePet={deletePet}
              key={index}
            />
          ))}
        </>
      </Row>
    </>
  );
};

Pets.propTypes = {
  address: PropTypes.string.isRequired,
  fetchBalance: PropTypes.func.isRequired,
};

export default Pets;
