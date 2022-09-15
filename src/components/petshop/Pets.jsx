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
    toast(<NotificationSuccess text="Getting Pets Data" />);
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
    toast(<NotificationSuccess text="Getting Mod Data" />);
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
      .then(async () => {
        toast(<NotificationSuccess text="Pet added successfully." />);
        await getPets();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to add pet." />);
      });
  };

  const adoptPet = async (pet) => {
    setLoading(true);
    adoptPetAction(address, pet, modContract)
      .then(async () => {
        toast(<NotificationSuccess text="Pet adopted successfully" />);
        await getPets();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to adopt pet." />);
        setLoading(false);
      });
  };

  const deletePet = async (pet) => {
    setLoading(true);
    deletePetAction(address, pet.appId)
      .then(async () => {
        toast(<NotificationSuccess text="Pet deleted successfully" />);
        await getPets();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to delete pet." />);
        setLoading(false);
      });
  };

  //Mod Methods
  const createMod = async (adoptionFee) => {
    setLoading(true);
    createModContract(address, adoptionFee)
      .then(async () => {
        toast(
          <NotificationSuccess text="Mod contract created successfully." />
        );
        await getModStatus();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to create mod contract." />);
        setLoading(false);
      });
  };

  const updateFee = async (newFee) => {
    setLoading(true);
    updateFeeAction(address, modContract, newFee)
      .then(async () => {
        toast(<NotificationSuccess text="Adoption Fee updated successfully" />);
        await getModStatus();
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
